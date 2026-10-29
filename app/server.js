'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');

const appName = process.env.APP_NAME || 'ekfc-field-support-api';
const version = process.env.APP_VERSION || '1.0.0';
const environment = process.env.APP_ENV || 'dev';
const port = Number(process.env.PORT || 3000);
const maxRequestBytes = 16 * 1024;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let body = '';
  let bytesRead = 0;

  for await (const chunk of req) {
    bytesRead += chunk.length;

    if (bytesRead > maxRequestBytes) {
      const error = new Error('payload_too_large');
      error.statusCode = 413;
      throw error;
    }

    body += chunk;
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('invalid_json');
    error.statusCode = 400;
    throw error;
  }
}

function createServer() {
  const tickets = [];

  return http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/info') {
      sendJson(res, 200, {
        name: appName,
        version,
        environment
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/tickets') {
      sendJson(res, 200, { tickets });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/tickets') {
      let payload;

      try {
        payload = await readJson(req);
      } catch (error) {
        sendJson(res, error.statusCode || 400, {
          error: error.message
        });
        return;
      }

      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        sendJson(res, 400, { error: 'invalid_ticket' });
        return;
      }

      const title =
        typeof payload.title === 'string' ? payload.title.trim() : '';
      const description =
        typeof payload.description === 'string'
          ? payload.description.trim()
          : '';
      const priority = payload.priority ?? 'normal';
      const errors = {};

      if (!title) {
        errors.title = 'required';
      } else if (title.length > 120) {
        errors.title = 'must be 120 characters or fewer';
      }

      if (!description) {
        errors.description = 'required';
      } else if (description.length > 1000) {
        errors.description = 'must be 1000 characters or fewer';
      }

      if (!['low', 'normal', 'high'].includes(priority)) {
        errors.priority = 'must be low, normal, or high';
      }

      if (Object.keys(errors).length > 0) {
        sendJson(res, 400, {
          error: 'invalid_ticket',
          details: errors
        });
        return;
      }

      const ticket = {
        id: randomUUID(),
        title,
        description,
        priority,
        status: 'open',
        createdAt: new Date().toISOString()
      };

      tickets.push(ticket);
      sendJson(res, 201, ticket);
      return;
    }

    sendJson(res, 404, { error: 'not_found' });
  });
}

if (require.main === module) {
  const server = createServer();

  server.listen(port, '0.0.0.0', () => {
    console.log(
      `${appName} ${version} listening on ${port} (${environment})`
    );
  });
}

module.exports = { createServer };