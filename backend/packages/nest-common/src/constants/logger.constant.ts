/** Never written to logs (plan §6A.2 Logging). */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.refreshToken',
];
export const REQUEST_ID_HEADER = 'x-request-id';
