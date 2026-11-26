import fs from 'fs';
if (typeof process.loadEnvFile === 'function' && fs.existsSync('.env')) {
  process.loadEnvFile();
}
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { initDatabase, getPGlite, getDbMode } from './lib/db.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route modules
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { roleRoutes } from './modules/roles/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { companyRoutes } from './modules/company/routes.js';
import { mastersRoutes } from './modules/masters/routes.js';
import { locationRoutes } from './modules/locations/routes.js';
import { vendorRoutes } from './modules/vendors/routes.js';
import { purchaseRoutes } from './modules/purchases/routes.js';
import { barcodeRoutes } from './modules/barcodes/routes.js';
import { inventoryRoutes } from './modules/inventory/routes.js';
import { displayRoutes } from './modules/display/routes.js';
import { transferRoutes } from './modules/transfers/routes.js';
import { damageRoutes } from './modules/damage/routes.js';
import { ageingRoutes } from './modules/ageing/routes.js';
import { customerRoutes } from './modules/customers/routes.js';
import { saleRoutes } from './modules/sales/routes.js';
import { offerRoutes } from './modules/offers/routes.js';
import { accountingRoutes } from './modules/accounting/routes.js';
import { capitalRoutes } from './modules/capital/routes.js';
import { bankRoutes } from './modules/bank/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { reportsRoutes } from './modules/reports/routes.js';
import { alertRoutes } from './modules/alerts/routes.js';
import { integrationsRoutes } from './modules/integrations/routes.js';
import { databaseRoutes } from './modules/database/routes.js';
import cron from 'node-cron';

export const app = express();
app.set('trust proxy', 1);
export { initDatabase } from './lib/db.js';
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    if (
      !origin ||
      origin === 'https://web-digisquares1.vercel.app' ||
      allowed.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1')))
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((_req, res, next) => { res.setHeader('x-request-id', randomUUID()); next(); });
app.use('/uploads', express.static('uploads'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/masters', mastersRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/barcodes', barcodeRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/display', displayRoutes);
app.use('/api/v1/transfers', transferRoutes);
app.use('/api/v1/damage', damageRoutes);
app.use('/api/v1/ageing', ageingRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/accounting', accountingRoutes);
app.use('/api/v1/capital', capitalRoutes);
app.use('/api/v1/bank', bankRoutes);
app.use('/api/v1/bank-gst', bankRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/integrations', integrationsRoutes);
app.use('/api/v1/database', databaseRoutes);

const healthHandler = async (_req: any, res: any) => {
  try {
    const db = getPGlite();
    const r = await db.query('SELECT current_database() as db');
    const dbName = (r.rows[0] as any)?.db || 'unknown';
    res.json({
      status: 'ok',
      database: dbName,
      mode: getDbMode(),
      version: process.env.npm_package_version || '1.0.0',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local',
      ts: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'error',
      error: { code: 'DB_UNAVAILABLE', message: 'Database connection unavailable' },
      ts: new Date().toISOString(),
    });
  }
};
app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
app.use(errorHandler);

export async function start() {
  await initDatabase();
  const server = app.listen(PORT, () => {
    logger.info(`SoleControl API → http://localhost:${PORT}`);
  });

  // Nightly ageing computation at 2 AM IST (20:30 UTC)
  cron.schedule('30 20 * * *', () => {
    logger.info('Nightly ageing job starting...');
    // Ageing computation is triggered via POST /api/v1/ageing/compute-recommendations
    // The route handler contains the logic; here we just log the trigger
    logger.info('Nightly ageing job: call POST /api/v1/ageing/compute-recommendations to run manually');
  });

  return server;
}

// Always start server unless running under vitest / test runner or serverless environment
if (!process.env.VITEST && process.env.NODE_ENV !== 'test' && !process.env.VERCEL && !process.env.SERVERLESS) {
  start().catch((err) => { logger.error(err, 'Failed to start'); process.exit(1); });
}
