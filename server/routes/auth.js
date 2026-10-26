/* Sign-in: customers with mobile OTP, hotel partners and admins with email + password. */
import { HttpError, conflict, unauthorized } from '../http.js';
import { hashOtp, hashPassword, newId, newOtp, sameHash, signToken, verifyPassword } from '../lib/security.js';
import { email, password, phone, str, validate } from '../lib/validate.js';
import { sendOtpSms } from '../services/notify.js';

const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_15_MIN = 5;
const LOCK_AFTER_FAILURES = 5;
const TOKEN_TTL = { customer: 30 * 86400, partner: 7 * 86400, admin: 12 * 3600 };

export const userOut = (u) => ({ id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone, createdAt: u.created_at });
const session = (config, user) => ({ token: signToken({ sub: user.id, role: user.role }, config.jwtSecret, TOKEN_TTL[user.role]), user: userOut(user) });

// Compared against when the email is unknown, so response time does not reveal which emails exist.
let dummyHash;
const getDummyHash = async () => (dummyHash ||= await hashPassword('not-a-real-password'));

export default function authRoutes(r) {
  /* ------------------------------------------------------------ customers: OTP */
  r.post('/api/auth/otp', async ({ db, body, config }) => {
    const v = validate(body, { phone: phone({ required: true }) });
    const recent = await db.query("SELECT count(*) AS n FROM otp_codes WHERE phone = $1 AND created_at > now() - interval '15 minutes'", [v.phone]);
    if (recent.rows[0].n >= OTP_MAX_PER_15_MIN) throw new HttpError(429, 'too_many_requests', 'Too many OTP requests. Please wait a few minutes and try again.');
    const code = newOtp();
    await db.query(
      `INSERT INTO otp_codes (id, phone, code_hash, expires_at) VALUES ($1, $2, $3, now() + make_interval(mins => $4::int))`,
      [newId('otp'), v.phone, hashOtp(config.jwtSecret, v.phone, code), OTP_TTL_MINUTES],
    );
    await sendOtpSms(config, v.phone, code);
    return { sent: true, expiresInSeconds: OTP_TTL_MINUTES * 60, ...(config.otpDemo ? { demoCode: code } : {}) };
  });

  r.post('/api/auth/otp/verify', async ({ db, body, config }) => {
    const v = validate(body, {
      phone: phone({ required: true }),
      code: str({ required: true, pattern: /^\d{6}$/, patternMsg: 'must be the 6-digit code' }),
      name: str({ max: 60 }),
    });
    const otp = (await db.query('SELECT * FROM otp_codes WHERE phone = $1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1', [v.phone])).rows[0];
    if (!otp || new Date(otp.expires_at) < new Date()) throw new HttpError(401, 'otp_expired', 'This OTP has expired. Please request a new one.');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, 'too_many_attempts', 'Too many incorrect attempts. Please request a new OTP.');
    if (!sameHash(otp.code_hash, hashOtp(config.jwtSecret, v.phone, v.code))) {
      await db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
      throw new HttpError(401, 'invalid_otp', 'Incorrect OTP. Please check and try again.');
    }
    const used = await db.query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL', [otp.id]);
    if (!used.rowCount) throw new HttpError(401, 'otp_expired', 'This OTP has already been used. Please request a new one.');
    const { rows } = await db.query(
      `INSERT INTO users (id, role, name, phone, last_login_at) VALUES ($1, 'customer', $2, $3, now())
       ON CONFLICT (phone) WHERE role = 'customer' DO UPDATE
         SET last_login_at = now(),
             name = CASE WHEN users.name IN ('', 'Traveller') AND $4 <> '' THEN $4 ELSE users.name END
       RETURNING *`,
      [newId('usr'), v.name || 'Traveller', v.phone, v.name || ''],
    );
    return session(config, rows[0]);
  });

  /* ------------------------------------------------------------ partners & admins */
  r.post('/api/auth/partner/signup', async (ctx) => {
    const { db, body, config } = ctx;
    const v = validate(body, {
      name: str({ required: true, min: 2, max: 80 }),
      email: email({ required: true }),
      phone: phone({ required: true }),
      password: password({ required: true, strong: true }),
    });
    const taken = await db.query("SELECT 1 FROM users WHERE role IN ('partner', 'admin') AND lower(email) = $1", [v.email]);
    if (taken.rows[0]) throw conflict('email_taken', 'An account with this email already exists. Please log in instead.');
    const { rows } = await db.query(
      `INSERT INTO users (id, role, name, email, phone, password_hash, last_login_at)
       VALUES ($1, 'partner', $2, $3, $4, $5, now()) RETURNING *`,
      [newId('usr'), v.name, v.email, v.phone, await hashPassword(v.password)],
    );
    ctx.status = 201;
    return session(config, rows[0]);
  });

  r.post('/api/auth/login', async ({ db, body, config }) => {
    const v = validate(body, { email: email({ required: true }), password: password({ required: true }) });
    const u = (await db.query("SELECT * FROM users WHERE role IN ('partner', 'admin') AND lower(email) = $1", [v.email])).rows[0];
    if (u && u.locked_until && new Date(u.locked_until) > new Date()) {
      throw new HttpError(429, 'locked', 'Too many failed attempts. Please try again in 15 minutes.');
    }
    const ok = u && u.password_hash ? await verifyPassword(v.password, u.password_hash) : (await verifyPassword(v.password, await getDummyHash()), false);
    if (!ok) {
      if (u) {
        await db.query(
          `UPDATE users SET failed_logins = failed_logins + 1,
                  locked_until = CASE WHEN failed_logins + 1 >= $2 THEN now() + interval '15 minutes' ELSE locked_until END
            WHERE id = $1`,
          [u.id, LOCK_AFTER_FAILURES],
        );
      }
      throw unauthorized('Incorrect email or password');
    }
    await db.query('UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1', [u.id]);
    return session(config, u);
  });

  /* ------------------------------------------------------------ profile */
  r.get('/api/me', async ({ user }) => ({ user: userOut(user) }), { auth: 'any' });

  r.patch('/api/me', async ({ db, user, body }) => {
    const rules = user.role === 'customer' ? { name: str({ min: 2, max: 60 }), email: email() } : { name: str({ min: 2, max: 80 }) };
    const v = validate(body, rules, { partial: true });
    const { rows } = await db.query(
      'UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email) WHERE id = $1 RETURNING *',
      [user.id, v.name ?? null, v.email ?? null],
    );
    return { user: userOut(rows[0]) };
  }, { auth: 'any' });
}
