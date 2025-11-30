import { genericHazards, sectorHazards, nafHazards, normalizeSector } from './data.js';

const sendJson = (res, status, payload) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Open CORS to avoid surprises if the frontend calls with an absolute domain.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(status).send(JSON.stringify(payload, null, 2));
};

export default function handler(req, res) {
  const segments = Array.isArray(req.query.path) ? req.query.path : [];
  const [root, value] = segments;

  if (root === 'generic') {
    return sendJson(res, 200, genericHazards);
  }

  if (root === 'sector') {
    const key = normalizeSector(value || '');
    return sendJson(res, 200, sectorHazards[key] || []);
  }

  if (root === 'naf') {
    const nafCode = (value || '').toUpperCase();
    return sendJson(res, 200, nafHazards[nafCode] || []);
  }

  return sendJson(res, 404, { error: 'Not found' });
}
