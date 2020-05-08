/* eslint-disable no-underscore-dangle */
/**
 * Request handlers
 */

// Dependencies
const users = require('../handlers/users.js');
const tokens = require('../handlers/tokens.js');
const checks = require('../handlers/checks.js');

// Handlers
const handlers = {};

// Hello
handlers.hello = (data, callback) => {
  callback(200, { message: 'Hello World!' });
};

// Ping
handlers.ping = (data, callback) => {
  callback(200);
};

// Users
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    users[data.method](data, callback);
  } else {
    callback(404);
  }
};

// Tokens
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    tokens[data.method](data, callback);
  } else {
    callback(404);
  }
};

// Tokens
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    checks[data.method](data, callback);
  } else {
    callback(404);
  }
};

// Not Found
handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;
