/* The API application: routing, authentication, body parsing and error handling. */
import { loadConfig } from './config.js';
import { openDatabase } from './db/index.js';
import { HttpError, forbidden, readJson, sendJson, unauthorized } from './http.js';
import { verifyToken } from './lib/security.js';
import { Router } from './router.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import hotelRoutes from './routes/hotels.js';
import partnerRoutes from './routes/partner.js';
import systemRoutes from './routes/system.js';

// Which roles may call a route: auth: 'customer' | 'partner' | 'admin' | 'any'.
const ROLE_OK = {
  any: () => true,
  customer: (role) => role === 'customer',
  partner: (role) => role === 'partner',
  admin: (role) => role === 'admin',
};

async function authenticate(ctx, need) {
  const header = String(ctx.req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const claims = token ? verifyToken(token, ctx.config.jwtSecret) : null;
  if (!claims) {
    if (need) throw unauthorized(token ? 'Your session has expired. Please log in again.' : undefined);
    return null;
  }
  const { rows } = await ctx.db.query('SELECT id, role, name, email, phone, created_at FROM users WHERE id = $1', [claims.sub]);
  const user = rows[0];
  if (!user) {
    if (need) throw unauthorized('Your session has expired. Please log in again.');
    return null;
  }
  if (need && !ROLE_OK[need](user.role)) {
    throw forbidden(need === 'customer' ? 'Please log in with your customer account (mobile number) to manage bookings' : 'Your account cannot access this area');
  }
  return user;
}

export function createApp({ config = loadConfig(), db } = {}) {
  const router = new Router();
  [systemRoutes, authRoutes, hotelRoutes, bookingRoutes, partnerRoutes, adminRoutes].forEach((register) => register(router));

  let dbPromise = db ? Promise.resolve(db) : null;
  const getDb = () => {
    if (!dbPromise) {
      dbPromise = openDatabase(config).catch((err) => {
        dbPromise = null; // retry on the next request
        throw err;
      });
    }
    return dbPromise;
  };

  async function handle(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const m = router.match(req.method, path);
    if (!m) throw new HttpError(404, 'not_found', 'No such API endpoint');
    if (m.methodNotAllowed) throw new HttpError(405, 'method_not_allowed', `${req.method} is not supported here`);
    const { route, params } = m;
    if (config.problems.length && !route.opts.allowMisconfigured) {
      throw new HttpError(503, 'misconfigured', `The API is not configured correctly: ${config.problems.join(' ')}`);
    }
    const ctx = { req, res, config, params, query: Object.fromEntries(url.searchParams), status: 200 };
    ctx.db = await getDb();
    ctx.body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readJson(req) : {};
    ctx.user = await authenticate(ctx, route.opts.auth);
    const out = await route.handler(ctx);
    sendJson(res, ctx.status, out === undefined ? { ok: true } : out);
  }

  const app = async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
        return;
      }
      if (err && err.code === '23505') {
        sendJson(res, 409, { error: { code: 'duplicate', message: 'This record already exists' } });
        return;
      }
      console.error('[api]', req.method, req.url, err);
      sendJson(res, 500, { error: { code: 'internal', message: 'Something went wrong on our side. Please try again.' } });
    }
  };
  app.getDb = getDb;
  app.config = config;
  return app;
}
