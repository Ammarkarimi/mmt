/* HTTP helpers: errors, JSON responses and body parsing. */

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Please log in to continue') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this resource') => new HttpError(403, 'forbidden', message);
export const notFound = (what = 'Resource') => new HttpError(404, 'not_found', `${what} not found`);
export const conflict = (code, message, details) => new HttpError(409, code, message, details);

export function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(json);
}

const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest('Request body is not valid JSON');
  }
};

export async function readJson(req, limit = 256 * 1024) {
  const type = String(req.headers['content-type'] || '');
  // Vercel's Node runtime may already have buffered and parsed the body.
  if ('body' in req) {
    let b;
    try {
      b = req.body;
    } catch {
      throw badRequest('Request body is not valid JSON');
    }
    if (b === undefined || b === null || b === '') return {};
    if (typeof b === 'string' || Buffer.isBuffer(b)) {
      if (b.length > limit) throw new HttpError(413, 'payload_too_large', 'Request body is too large');
      return parse(b.toString('utf8'));
    }
    if (!type.includes('application/json')) throw new HttpError(415, 'unsupported_media_type', 'Send the request body as application/json');
    return b;
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'payload_too_large', 'Request body is too large');
    chunks.push(c);
  }
  if (!size) return {};
  if (!type.includes('application/json')) throw new HttpError(415, 'unsupported_media_type', 'Send the request body as application/json');
  return parse(Buffer.concat(chunks).toString('utf8'));
}
