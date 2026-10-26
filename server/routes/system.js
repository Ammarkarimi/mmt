/* Health check, reference data for forms, and the scheduled hold sweeper. */
import { HttpError } from '../http.js';
import { ALL_PROPERTY_TYPES, AMENITIES, MEAL_PLANS, PROPERTY_TYPES, ROOM_AMENITIES, SCENES } from '../services/catalog.js';
import { HOTEL_COUPONS } from '../services/coupons.js';
import { expireHolds } from '../services/inventory.js';
import { CANCELLATION_POLICIES } from '../services/policies.js';
import { GST_SLABS } from '../services/pricing.js';

export default function systemRoutes(r) {
  r.get('/api/health', async ({ db, config }) => {
    const started = Date.now();
    await db.query('SELECT 1');
    return {
      ok: config.problems.length === 0,
      database: db.kind,
      ephemeral: config.ephemeral,
      otpDemo: config.otpDemo,
      latencyMs: Date.now() - started,
      problems: config.problems,
      warnings: config.warnings,
      time: new Date().toISOString(),
    };
  }, { allowMisconfigured: true });

  r.get('/api/meta', async ({ config }) => ({
    propertyTypes: PROPERTY_TYPES,
    allPropertyTypes: ALL_PROPERTY_TYPES,
    amenities: AMENITIES,
    roomAmenities: ROOM_AMENITIES,
    scenes: SCENES,
    mealPlans: Object.entries(MEAL_PLANS).map(([key, v]) => ({ key, ...v })),
    cancellationPolicies: Object.entries(CANCELLATION_POLICIES).map(([key, v]) => ({ key, label: v.label, after: v.afterLabel })),
    gstSlabs: GST_SLABS.map((s) => ({ upTo: Number.isFinite(s.upTo) ? s.upTo : null, rate: s.rate })),
    coupons: HOTEL_COUPONS.map((c) => ({ code: c.code, desc: c.desc })),
    holdMinutes: config.holdMinutes,
    defaultCommissionPct: config.defaultCommissionPct,
  }));

  // Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET". Holds are also expired
  // lazily on every availability read, so this is only a safety net.
  r.get('/api/cron/expire-holds', async ({ db, req }) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) throw new HttpError(401, 'unauthorized', 'Missing or invalid cron secret');
    return { expired: await expireHolds(db, { force: true }) };
  });
}
