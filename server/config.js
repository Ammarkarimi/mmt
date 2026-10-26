/* Runtime configuration, read once from environment variables. */

const int = (v, d) => (v !== undefined && v !== '' && Number.isFinite(+v) ? Math.trunc(+v) : d);
const flag = (v, d) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));

export function loadConfig(env = process.env) {
  const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL || '';
  const cfg = {
    databaseUrl,
    // Without a DATABASE_URL the API runs on an in-memory PGlite database that is
    // rebuilt (and re-seeded) on every cold start – fine for demos and tests only.
    ephemeral: !databaseUrl,
    pgliteDir: env.PGLITE_DIR || '',
    jwtSecret: env.JWT_SECRET || '',
    // No SMS gateway is wired in yet, so by default the OTP is returned in the API
    // response and shown on screen. Set OTP_DEMO=0 once SMS_WEBHOOK_URL is configured.
    otpDemo: flag(env.OTP_DEMO, true),
    smsWebhookUrl: env.SMS_WEBHOOK_URL || '',
    seedDemo: flag(env.SEED_DEMO, !databaseUrl),
    adminEmail: (env.ADMIN_EMAIL || '').trim().toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD || '',
    adminName: env.ADMIN_NAME || 'TripSaathi Admin',
    holdMinutes: int(env.HOLD_MINUTES, 15),
    maxActiveHolds: int(env.MAX_ACTIVE_HOLDS, 3),
    defaultCommissionPct: int(env.DEFAULT_COMMISSION_PCT, 15),
    problems: [],
    warnings: [],
  };
  if (!cfg.jwtSecret) {
    if (databaseUrl) cfg.problems.push('JWT_SECRET is not set. Add a long random JWT_SECRET environment variable.');
    // A fixed fallback keeps demo tokens valid across serverless instances.
    cfg.jwtSecret = 'tripsaathi-demo-secret-do-not-use-in-production';
    cfg.warnings.push('Using the built-in demo JWT secret');
  } else if (cfg.jwtSecret.length < 32) {
    cfg.problems.push('JWT_SECRET must be at least 32 characters long.');
  }
  if (cfg.ephemeral) cfg.warnings.push('No DATABASE_URL: using an in-memory demo database that resets on cold start');
  if (cfg.otpDemo) cfg.warnings.push('OTP demo mode: login codes are returned by the API');
  return cfg;
}
