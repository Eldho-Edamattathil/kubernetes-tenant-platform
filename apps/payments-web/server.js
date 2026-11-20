const http = require('node:http');
const { readFileSync } = require('node:fs');

const page = readFileSync(`${__dirname}/index.html`);
const api = process.env.PAYMENTS_API_URL || 'http://payments-api:8080';

http.createServer(async (req, res) => {
   if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }


  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page);
  }

  if (req.url !== '/payments' || !['GET', 'POST'].includes(req.method)) {
    res.writeHead(404);
    return res.end();
  }

  try {
    const options = { method: req.method, signal: AbortSignal.timeout(5000) };
    if (req.method === 'POST') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = req;
      options.duplex = 'half';
    }

    const upstream = await fetch(`${api}/payments`, options);
    const body = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(body);
  } catch {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Payments API is unavailable' }));
  }
}).listen(8080, '0.0.0.0');
