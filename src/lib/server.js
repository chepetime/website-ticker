/**
 * Server-related tasks
 */

// const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const util = require('util');

const debug = util.debuglog('server');

const decoder = new StringDecoder('utf-8');

const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const server = {};

/**
 * [router description]
 */

server.router = {
  hello: handlers.hello,
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

/**
 * Handle Server
 */

server.handleServer = (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  const reqPath = pathname.replace(/^\/+|\/+$/g, '');
  const method = req.method.toLowerCase();
  const { headers } = req;

  let payload = '';

  req.on('data', data => {
    payload += decoder.write(data);
  });

  req.on('end', () => {
    payload += decoder.end();

    const chosenHandler =
      typeof server.router[reqPath] !== 'undefined' ? server.router[reqPath] : handlers.notFound;

    const data = {
      path: reqPath,
      query,
      method,
      headers,
      payload: helpers.parseJsonToObject(payload),
    };

    chosenHandler(data, (statusCode = 200, prePayload) => {
      const newStatusCode = typeof statusCode === 'number' ? statusCode : 200;
      const newPayload = typeof prePayload === 'object' ? prePayload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(newPayload);

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(newStatusCode);
      res.end(payloadString);

      if (statusCode === '200') {
        // eslint-disable-next-line no-console
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${reqPath}  ${statusCode}`);
      } else {
        // eslint-disable-next-line no-console
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${reqPath}  ${statusCode}`);
      }
    });
  });
};

/**
 * HTTP Server
 */

server.handleServerListenDefault = () => {
  // eslint-disable-next-line no-console
  console.log('\x1b[36m%s\x1b[0m', `The server is listening the port ${config.httpPort}`);
};

server.httpServer = http.createServer(server.handleServer);

/**
 * HTTPS Server
 */

server.httpsServerOptions = {
  key: fs.readFileSync('./src/https/key.pem'),
  cert: fs.readFileSync('./src/https/cert.pem'),
};

server.handleServerListenSecure = () => {
  // eslint-disable-next-line no-console
  console.log('\x1b[35m%s\x1b[0m', `The server is listening the port ${config.httpsPort}`);
};

server.httpsServer = https.createServer(server.httpsServerOptions, server.handleServer);

server.init = () => {
  server.httpServer.listen(config.httpPort, server.handleServerListenDefault);
  server.httpsServer.listen(config.httpsPort, server.handleServerListenSecure);
};

module.exports = server;
