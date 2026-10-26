/* Calendar helpers. Stay dates are plain YYYY-MM-DD strings in Indian Standard Time. */

const DAY = 864e5;
const IST_OFFSET = 5.5 * 36e5;

export const isISODate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
};

export const todayIST = (now = Date.now()) => new Date(now + IST_OFFSET).toISOString().slice(0, 10);

export const addDays = (s, n) => new Date(Date.parse(`${s}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export const diffDays = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY);

export const dayOfWeek = (s) => new Date(`${s}T00:00:00Z`).getUTCDay();

export const eachDate = (from, toExclusive) => {
  const out = [];
  for (let d = from; d < toExclusive; d = addDays(d, 1)) out.push(d);
  return out;
};

/** The moment a stay starts, e.g. check-in date + "14:00" in IST. */
export const istMoment = (dateStr, hhmm = '00:00') => new Date(`${dateStr}T${hhmm}:00+05:30`);
