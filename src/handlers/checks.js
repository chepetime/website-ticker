/* eslint-disable no-console */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
const config = require('../lib/config');
const data = require('../lib/data');
const helpers = require('../lib/helpers.js');
const utils = require('../lib/utils.js');
const tokens = require('./tokens.js');

const ERROR_MESSAGES = {
  GENERIC: { Error: 'General Error' },
  MISSING_FIELDS: { Error: 'Missing required field(s).' },
  MISSING_TOKEN: { Error: 'Missing required token.' },
  MAX_CHECKS: { Error: 'Max checks reached.' },
};

const handler = {
  name: 'checks',
};

// Required data: protocol, url, method, sucesssCodes, timeoutSecs
// Optional data: none
handler.post = ({ payload, headers }, callback) => {
  // Required vields
  const protocol = utils.handleTextInputValid(payload.protocol, ['http', 'https']);
  const url = utils.handleTextInput(payload.url, 0);
  const method = utils.handleTextInputValid(payload.method, ['post', 'get', 'put', 'delete']);
  const successCodes = utils.handleArrayInput(payload.successCodes);
  const timeoutSecs = utils.handleNumberInput(payload.timeoutSecs, 1, 5);

  // Validate fields
  if (!protocol || !url || !method || !successCodes || !timeoutSecs) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  // Get auth token
  const tokenId = typeof headers.token === 'string' ? headers.token : false;

  // check if token is valid
  data.read('tokens', tokenId, (errToken, tokenData) => {
    if (errToken || !tokenData) {
      return callback(403);
    }

    // Get phone to identify user
    const { phone } = tokenData;
    data.read('users', phone, (errRead, userData) => {
      if (errRead || !userData) {
        return callback(403);
      }

      // Verify if user has any check, if not create base object.
      const userChecks =
        typeof userData.checks === 'object' && userData.checks instanceof Array
          ? userData.checks
          : [];

      // Verify user is not over the limit
      if (userChecks.length >= config.maxChecks) {
        return callback(400, ERROR_MESSAGES.MAX_CHECKS);
      }

      const checkObject = {
        id: helpers.createRandomString(20),
        phone,
        protocol,
        url,
        method,
        successCodes,
        timeoutSecs,
      };

      data.create('checks', checkObject.id, checkObject, errCreate => {
        if (errCreate) {
          return callback(500);
        }
        const userObject = userData;
        userObject.checks = userChecks;
        userObject.checks.push(checkObject.id);
        data.update('users', tokenData.phone, userObject, errUpdate => {
          return errUpdate ? callback(500) : callback(200, checkObject);
        });
      });
    });
  });
};

// Required data: id
// Optional data: none
handler.get = ({ query, headers }, callback) => {
  const id = utils.handleTextInput(query.id, 10);

  if (!id) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  // Get auth token
  const token = typeof headers.token === 'string' ? headers.token : false;

  // Get check
  data.read('checks', id, (errCheck, checkData) => {
    if (errCheck || !checkData) {
      return callback(404);
    }

    // Get user phone as id
    const { phone } = checkData;

    // Verify token
    tokens.verifyToken(token, phone, tokenIsValid => {
      return tokenIsValid ? callback(200, checkData) : callback(403, ERROR_MESSAGES.MISSING_TOKEN);
    });
  });
};

// Required data: id
// Optional data: protocol, url, method, sucesssCodes, timeoutSecs
handler.put = ({ payload, headers }, callback) => {
  const id = utils.handleTextInput(payload.id, 20);
  if (!id) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  // Get auth token
  const token = typeof headers.token === 'string' ? headers.token : false;

  const protocol = utils.handleTextInputValid(payload.protocol, ['http', 'https']);
  const url = utils.handleTextInput(payload.url, 0);
  const method = utils.handleTextInputValid(payload.method, ['post', 'get', 'put', 'delete']);
  const successCodes = utils.handleArrayInput(payload.successCodes);
  const timeoutSecs = utils.handleNumberInput(payload.timeoutSecs, 1, 5);

  // Validate fields
  if (!protocol && !url && !method && !successCodes && !timeoutSecs) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  data.read('checks', id, (errCheck, checkData) => {
    if (errCheck || !checkData) {
      return callback(404);
    }

    // Verify token
    tokens.verifyToken(token, checkData.phone, tokenIsValid => {
      if (!tokenIsValid) {
        return callback(403, ERROR_MESSAGES.MISSING_TOKEN);
      }

      const newCheck = checkData;
      newCheck.protocol = protocol || checkData.protocol;
      newCheck.url = url || checkData.url;
      newCheck.method = method || checkData.method;
      newCheck.successCodes = successCodes || checkData.successCodes;
      newCheck.timeoutSecs = timeoutSecs || checkData.timeoutSecs;

      data.update('checks', id, newCheck, err => (!err ? callback(200) : callback(500)));
    });
  });
};

// Required data: id
// Optional data: none
handler.delete = ({ query, headers }, callback) => {
  const id = utils.handleTextInput(query.id, 20);

  if (!id) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  // Get auth token
  const token = typeof headers.token === 'string' ? headers.token : false;

  data.read('checks', id, (errCheck, checkData) => {
    if (errCheck || !checkData) {
      return callback(404);
    }

    // Verify token
    tokens.verifyToken(token, checkData.phone, tokenIsValid => {
      if (!tokenIsValid) {
        callback(403, ERROR_MESSAGES.MISSING_TOKEN);
      }

      // Get user with the check
      data.read('users', checkData.phone, (errRead, userData) => {
        if (errRead) {
          return callback(400, ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // Remove check from user
        const newUser = userData;
        newUser.checks = userData.checks.filter(el => el !== id);
        data.update('users', checkData.phone, newUser, err => {
          if (err) {
            return callback(500);
          }
          // Remove check file
          data.delete('checks', id, errDel => (!errDel ? callback(200) : callback(500)));
        });
      });
    });
  });
};

module.exports = handler;
