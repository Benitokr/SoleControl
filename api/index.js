import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let expressApp = null;
let initDbPromise = null;
let loadError = null;

try {
  const server = require('../apps/api/dist/server.js');
  expressApp = server.app;
  if (typeof server.initDatabase === 'function') {
    initDbPromise = server.initDatabase().catch((err) => {
      loadError = err;
      console.error('Database initialization failed:', err.message);
    });
  }
} catch (err) {
  loadError = err;
  console.error('Failed to load compiled API server:', err.message);
}

export default async function handler(req, res) {
  if (!expressApp) {
    return res.status(503).json({
      error: {
        code: 'API_UNAVAILABLE',
        message: 'Backend server could not be initialized. Check build artifacts and DATABASE_URL.',
      },
    });
  }

  if (initDbPromise) {
    try {
      await initDbPromise;
    } catch (err) {
      return res.status(503).json({
        error: {
          code: 'DB_UNAVAILABLE',
          message: 'Database connection unavailable.',
        },
      });
    }
  }

  if (loadError) {
    return res.status(503).json({
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Database connection unavailable.',
      },
    });
  }

  const rawUrl = req.url || '';
  let searchParamsPath = '';
  if (rawUrl.includes('path=')) {
    try {
      const u = new URL(rawUrl, 'http://localhost');
      searchParamsPath = u.searchParams.get('path') ? '/' + u.searchParams.get('path') : '';
    } catch {}
  }
  const queryPath = req.query && req.query.path ? '/' + req.query.path : '';
  const matchedPath =
    req.headers['x-matched-path'] ||
    req.headers['x-vercel-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-uri'] ||
    '';
  const urlPath = rawUrl.split('?')[0];
  const candidate =
    searchParamsPath ||
    queryPath ||
    matchedPath ||
    (urlPath !== '/api/index' && urlPath !== '/api' ? urlPath : '');

  if (candidate) {
    let queryString = '';
    if (rawUrl.includes('?')) {
      try {
        const u = new URL(rawUrl, 'http://localhost');
        u.searchParams.delete('path');
        const qs = u.searchParams.toString();
        if (qs) queryString = '?' + qs;
      } catch {}
    }
    const basePath = (
      candidate.startsWith('/api')
        ? candidate
        : '/api' + (candidate.startsWith('/') ? '' : '/') + candidate
    ).split('?')[0];
    req.url = basePath + queryString;
  }

  return expressApp(req, res);
}
