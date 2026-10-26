/* Small declarative validator. Each rule turns raw input into a clean value or throws. */
import { HttpError } from '../http.js';
import { isISODate } from './dates.js';

class Invalid extends Error {}
const fail = (msg) => {
  throw new Invalid(msg);
};

const rule = (parse, opts = {}) => ({ parse, ...opts });

export const str = ({ min = 0, max = 255, pattern, patternMsg, upper, lower, ...o } = {}) =>
  rule((v) => {
    if (typeof v !== 'string' && typeof v !== 'number') fail('must be text');
    let s = String(v).trim().replace(/\s+/g, ' ');
    if (upper) s = s.toUpperCase();
    if (lower) s = s.toLowerCase();
    if (s.length < min) fail(min === 1 ? 'is required' : `must be at least ${min} characters`);
    if (s.length > max) fail(`must be at most ${max} characters`);
    if (pattern && s && !pattern.test(s)) fail(patternMsg || 'has an invalid format');
    return s;
  }, o);

// Multi-line text: keeps line breaks, trims each end.
export const text = ({ max = 4000, ...o } = {}) =>
  rule((v) => {
    if (typeof v !== 'string') fail('must be text');
    const s = v.replace(/\r\n/g, '\n').trim();
    if (s.length > max) fail(`must be at most ${max} characters`);
    return s;
  }, o);

export const int = ({ min = -Infinity, max = Infinity, ...o } = {}) =>
  rule((v) => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isInteger(n)) fail('must be a whole number');
    if (n < min) fail(`must be at least ${min}`);
    if (n > max) fail(`must be at most ${max}`);
    return n;
  }, o);

export const num = ({ min = -Infinity, max = Infinity, ...o } = {}) =>
  rule((v) => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) fail('must be a number');
    if (n < min || n > max) fail(`must be between ${min} and ${max}`);
    return n;
  }, o);

export const bool = (o = {}) =>
  rule((v) => {
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return fail('must be true or false');
  }, o);

export const oneOf = (values, o = {}) =>
  rule((v) => {
    if (!values.includes(v)) fail(`must be one of: ${values.join(', ')}`);
    return v;
  }, o);

export const date = (o = {}) =>
  rule((v) => {
    if (typeof v !== 'string' || !isISODate(v)) fail('must be a date in YYYY-MM-DD format');
    return v;
  }, o);

export const email = (o = {}) => str({ max: 120, lower: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, patternMsg: 'must be a valid email address', ...o });
export const phone = (o = {}) => str({ max: 10, pattern: /^[6-9]\d{9}$/, patternMsg: 'must be a valid 10-digit Indian mobile number', ...o });
export const url = (o = {}) => str({ max: 500, pattern: /^https:\/\/[^\s"'<>]+$/i, patternMsg: 'must be an https:// URL', ...o });

export const password = (o = {}) =>
  rule((v) => {
    if (typeof v !== 'string' || !v) fail('is required');
    if (v.length < 8) fail('must be at least 8 characters');
    if (v.length > 128) fail('must be at most 128 characters');
    if (o.strong && !(/[A-Za-z]/.test(v) && /\d/.test(v))) fail('must contain at least one letter and one number');
    return v;
  }, o);

export const list = (item, { max = 50, unique = false, ...o } = {}) =>
  rule((v) => {
    if (!Array.isArray(v)) fail('must be a list');
    if (v.length > max) fail(`can have at most ${max} items`);
    const out = v.map((x, i) => {
      try {
        return item.parse(x);
      } catch (e) {
        if (e instanceof Invalid) fail(`item ${i + 1} ${e.message}`);
        throw e;
      }
    });
    return unique ? [...new Set(out)] : out;
  }, o);

export const obj = (rules, o = {}) =>
  rule((v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) fail('must be an object');
    const { value, errors } = run(v, rules, { partial: o.partial !== false });
    const keys = Object.keys(errors);
    if (keys.length) fail(`${keys[0]} ${errors[keys[0]]}`);
    return value;
  }, o);

function run(input, rules, { partial }) {
  const value = {};
  const errors = {};
  for (const [key, r] of Object.entries(rules)) {
    const raw = input ? input[key] : undefined;
    if (raw === undefined || (raw === null && !r.nullable)) {
      if (partial) continue;
      if (r.required) errors[key] = 'is required';
      else if ('default' in r) value[key] = typeof r.default === 'function' ? r.default() : r.default;
      continue;
    }
    if (r.nullable && (raw === null || raw === '')) {
      value[key] = null;
      continue;
    }
    try {
      value[key] = r.parse(raw);
    } catch (e) {
      if (e instanceof Invalid) errors[key] = e.message;
      else throw e;
    }
  }
  return { value, errors };
}

/**
 * Validate `input` against `rules`. With `partial`, missing keys are skipped (PATCH semantics).
 * Throws a 400 HttpError listing every invalid field.
 */
export function validate(input, rules, { partial = false } = {}) {
  if (input !== undefined && (input === null || typeof input !== 'object' || Array.isArray(input))) {
    throw new HttpError(400, 'validation_error', 'Expected a JSON object');
  }
  const { value, errors } = run(input || {}, rules, { partial });
  if (Object.keys(errors).length) {
    const [k] = Object.keys(errors);
    throw new HttpError(400, 'validation_error', `${k} ${errors[k]}`, errors);
  }
  return value;
}

export const invalid = (field, message) => new HttpError(400, 'validation_error', `${field} ${message}`, { [field]: message });
