'use strict';

const http = require('node:http');

const appName = process.env.APP_NAME || 'ekfc-field-support-api';
const version = process.env.APP_VERSION || '1.0.0';
const environment = process.env.APP_ENV || 'dev';
const port = Number(process.env.PORT || 3000);

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/info') {
    res.writeHead(200);
    res.end(JSON.stringify({ name: appName, version, environment }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`${appName} ${version} listening on ${port} (${environment})`);
});
