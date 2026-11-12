import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getPGlite, getDbMode, getPrisma } from '../../lib/db.js';
import { auditService } from '../audit/service.js';
import crypto from 'crypto';

export const integrationRoutes = Router();
export const integrationsRoutes = integrationRoutes;

const PROVIDERS = ['whatsapp', 'barcode_service', 'bank_api', 'gst_portal', 'printer'];

function encryptCredential(value: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    return Buffer.from(value).toString('base64');
  }
  const keyBuf = Buffer.from(key.padEnd(32).slice(0, 32));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptCredential(value: string): string {
  if (!value.startsWith('gcm:')) {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return '***';
  const [, ivHex, tagHex, encHex] = value.split(':');
  const keyBuf = Buffer.from(key.padEnd(32).slice(0, 32));
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function maskCredentials(config: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    if (/key|secret|password|token|credential/i.test(k)) {
      masked[k] = v ? '••••••••' + v.slice(-4) : '';
    } else {
      masked[k] = v;
    }
  }
  return masked;
}

// GET / — list all integration settings with masked credentials
integrationRoutes.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const rows: any[] = [];
    if (getDbMode() === 'POSTGRES') {
      const prisma = getPrisma();
      const settings = await (prisma as any).integrationSetting.findMany({
        orderBy: { provider: 'asc' }
      });
      for (const s of settings) {
        let config: Record<string, string> = {};
        try { config = typeof s.config === 'string' ? JSON.parse(s.config) : (s.config || {}); } catch {}
        rows.push({ ...s, config: maskCredentials(config) });
      }
    } else {
      const db = getPGlite();
      const result = await db.query(`SELECT * FROM integration_settings ORDER BY provider`);
      for (const row of (result as any).rows || []) {
        let config: Record<string, string> = {};
        try { config = typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {}); } catch {}
        rows.push({ ...row, config: maskCredentials(config) });
      }
    }

    // Ensure all known providers have an entry (even if not configured)
    const configured = new Set(rows.map((r: any) => r.provider));
    for (const p of PROVIDERS) {
      if (!configured.has(p)) {
        rows.push({ id: null, provider: p, isActive: false, config: {}, lastTestedAt: null, lastStatus: 'NOT_CONFIGURED' });
      }
    }

    res.json({ data: rows, meta: { total: rows.length } });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

// GET /:provider/logs — recent integration logs
integrationRoutes.get('/:provider/logs', requireAuth, async (req: Request, res: Response) => {
  const { provider } = req.params;
  try {
    const rows: any[] = [];
    if (getDbMode() === 'POSTGRES') {
      const prisma = getPrisma();
      const logs = await (prisma as any).integrationLog.findMany({
        where: { provider },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      rows.push(...logs);
    } else {
      const db = getPGlite();
      const result = await db.query(
        `SELECT * FROM integration_logs WHERE provider = $1 ORDER BY created_at DESC LIMIT 50`,
        [provider]
      );
      rows.push(...((result as any).rows || []));
    }
    res.json({ data: rows, meta: { total: rows.length } });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

// PUT /:provider — save/update credentials
integrationRoutes.put('/:provider', requireAuth, async (req: Request, res: Response) => {
  const { provider } = req.params;
  const { config = {}, isActive = true } = req.body;

  // Encrypt sensitive fields
  const encryptedConfig: Record<string, string> = {};
  for (const [k, v] of Object.entries(config as Record<string, string>)) {
    if (/key|secret|password|token|credential/i.test(k) && v && !v.startsWith('••')) {
      encryptedConfig[k] = encryptCredential(v);
    } else {
      encryptedConfig[k] = v;
    }
  }

  try {
    let row: any;
    if (getDbMode() === 'POSTGRES') {
      const prisma = getPrisma();
      row = await (prisma as any).integrationSetting.upsert({
        where: { provider },
        update: { config: encryptedConfig, isActive, updatedAt: new Date() },
        create: { provider, config: encryptedConfig, isActive, lastStatus: 'NOT_TESTED' }
      });
    } else {
      const db = getPGlite();
      const existing = await db.query(`SELECT id FROM integration_settings WHERE provider = $1`, [provider]);
      if ((existing as any).rows?.length > 0) {
        await db.query(
          `UPDATE integration_settings SET config = $1, is_active = $2, updated_at = NOW() WHERE provider = $3`,
          [JSON.stringify(encryptedConfig), isActive, provider]
        );
      } else {
        await db.query(
          `INSERT INTO integration_settings (provider, config, is_active, last_status, created_at, updated_at)
           VALUES ($1, $2, $3, 'NOT_TESTED', NOW(), NOW())`,
          [provider, JSON.stringify(encryptedConfig), isActive]
        );
      }
      const r = await db.query(`SELECT * FROM integration_settings WHERE provider = $1`, [provider]);
      row = (r as any).rows?.[0];
    }

    // Write audit
    const actorId = (req as any).user?.sub || (req as any).user?.id || 'system';
    await auditService.log({
      action: 'UPDATE',
      entity: 'integration_settings',
      entityId: provider,
      userId: actorId,
      afterState: maskCredentials(encryptedConfig)
    });

    let responseConfig: Record<string, string> = {};
    try { responseConfig = typeof row?.config === 'string' ? JSON.parse(row.config) : (row?.config || {}); } catch {}
    res.json({ data: { ...row, config: maskCredentials(responseConfig) } });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DB_ERROR', message: err.message } });
  }
});

// POST /:provider/test — test real connectivity
integrationRoutes.post('/:provider/test', requireAuth, async (req: Request, res: Response) => {
  const { provider } = req.params;
  const start = Date.now();

  try {
    // Load saved config
    let config: Record<string, string> = {};
    if (getDbMode() === 'POSTGRES') {
      const prisma = getPrisma();
      const setting = await (prisma as any).integrationSetting.findUnique({ where: { provider } });
      if (setting?.config) {
        const raw = typeof setting.config === 'string' ? JSON.parse(setting.config) : setting.config;
        for (const [k, v] of Object.entries(raw as Record<string, string>)) {
          config[k] = /key|secret|password|token|credential/i.test(k) ? decryptCredential(v) : v;
        }
      }
    } else {
      const db = getPGlite();
      const r = await db.query(`SELECT config FROM integration_settings WHERE provider = $1`, [provider]);
      const raw = (r as any).rows?.[0]?.config;
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        for (const [k, v] of Object.entries(parsed as Record<string, string>)) {
          config[k] = /key|secret|password|token|credential/i.test(k) ? decryptCredential(v) : v;
        }
      }
    }

    let testResult: { connected: boolean; latencyMs?: number; error?: string } = {
      connected: false,
      error: 'Provider not configured'
    };

    const hasConfig = Object.keys(config).length > 0;

    if (!hasConfig) {
      testResult = { connected: false, error: 'No credentials saved. Configure the provider first.' };
    } else {
      switch (provider) {
        case 'whatsapp': {
          const apiUrl = config.api_url || 'https://api.twilio.com';
          const accountSid = config.account_sid;
          const authToken = config.auth_token;
          if (!accountSid || !authToken) {
            testResult = { connected: false, error: 'Missing account_sid or auth_token' };
          } else {
            try {
              const r = await fetch(`${apiUrl}/2010-04-01/Accounts/${accountSid}.json`, {
                headers: { Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') },
                signal: AbortSignal.timeout(8000)
              });
              testResult = r.ok
                ? { connected: true, latencyMs: Date.now() - start }
                : { connected: false, error: `HTTP ${r.status}: ${await r.text()}` };
            } catch (e: any) {
              testResult = { connected: false, error: e.message };
            }
          }
          break;
        }
        case 'barcode_service': {
          const baseUrl = config.base_url;
          if (!baseUrl) {
            testResult = { connected: false, error: 'Missing base_url' };
          } else {
            try {
              const r = await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
              testResult = { connected: r.ok || r.status < 500, latencyMs: Date.now() - start };
            } catch (e: any) {
              testResult = { connected: false, error: e.message };
            }
          }
          break;
        }
        case 'bank_api': {
          const baseUrl = config.api_url;
          if (!baseUrl) {
            testResult = { connected: false, error: 'Missing api_url' };
          } else {
            try {
              const r = await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
              testResult = { connected: r.ok || r.status < 500, latencyMs: Date.now() - start };
            } catch (e: any) {
              testResult = { connected: false, error: e.message };
            }
          }
          break;
        }
        case 'gst_portal': {
          const baseUrl = config.api_url || 'https://api.gst.gov.in';
          try {
            const r = await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            testResult = { connected: r.ok || r.status < 500, latencyMs: Date.now() - start };
          } catch (e: any) {
            testResult = { connected: false, error: e.message };
          }
          break;
        }
        case 'printer': {
          // Printer: validate config, no actual network test possible without hardware
          const protocol = config.protocol || 'PDF';
          if (protocol === 'PDF') {
            testResult = { connected: true, latencyMs: 0 };
          } else if (protocol === 'TCP' && config.printer_ip) {
            testResult = { connected: false, error: 'ESC/POS over TCP requires network reachability — configure printer_ip and test manually' };
          } else {
            testResult = { connected: false, error: 'Unsupported protocol or missing printer_ip' };
          }
          break;
        }
        default:
          testResult = { connected: false, error: `Unknown provider: ${provider}` };
      }
    }

    // Log the test result
    const logData = { provider, ...testResult, testedAt: new Date().toISOString() };
    try {
      if (getDbMode() === 'POSTGRES') {
        const prisma = getPrisma();
        await (prisma as any).integrationLog.create({
          data: {
            provider,
            action: 'TEST',
            status: testResult.connected ? 'SUCCESS' : 'FAILED',
            message: testResult.error || `Connected in ${testResult.latencyMs}ms`,
            metadata: logData
          }
        });
        await (prisma as any).integrationSetting.updateMany({
          where: { provider },
          data: {
            lastTestedAt: new Date(),
            lastStatus: testResult.connected ? 'CONNECTED' : 'FAILED',
            updatedAt: new Date()
          }
        });
      } else {
        const db = getPGlite();
        await db.query(
          `INSERT INTO integration_logs (provider, action, status, message, created_at)
           VALUES ($1, 'TEST', $2, $3, NOW())
           ON CONFLICT DO NOTHING`,
          [provider, testResult.connected ? 'SUCCESS' : 'FAILED', testResult.error || `Connected in ${testResult.latencyMs}ms`]
        ).catch(() => {});
        await db.query(
          `UPDATE integration_settings SET last_tested_at = NOW(), last_status = $1 WHERE provider = $2`,
          [testResult.connected ? 'CONNECTED' : 'FAILED', provider]
        ).catch(() => {});
      }
    } catch (_logErr) { /* non-fatal */ }

    res.json({ data: testResult });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'TEST_ERROR', message: err.message } });
  }
});
