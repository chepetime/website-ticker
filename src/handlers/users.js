/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
const data = require('../lib/data');
const helpers = require('../lib/helpers.js');
const utils = require('../lib/utils.js');
const tokens = require('./tokens.js');
const checks = require('./checks.js');

const ERROR_MESSAGES = {
  GENERIC: { Error: 'General Error' },
  MISSING_FIELDS: { Error: 'Missing required field(s).' },
  MISSING_TOKEN: { Error: 'Missing required token.' },
  PASSWORD_HASH: { Error: 'Could not process password.' },
  ALREADY_EXIST: { Error: 'A user with that phone number already exists.' },
  USER_NOT_FOUND: { Error: 'Could not find the user.' },
};

const handler = {
  name: 'users',
};

// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handler.post = ({ payload }, callback) => {
  const firstName = utils.handleTextInput(payload.firstName);
  const lastName = utils.handleTextInput(payload.lastName);
  const phone = utils.handleTextInput(payload.phone);
  const password = utils.handleTextInput(payload.password);
  const tosAgreement = utils.handleTextBoolean(payload.tosAgreement);

  if (!firstName || !lastName || !phone || !password || !tosAgreement) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  data.read('users', phone, (errRead, userData) => {
    if (!errRead) {
      return callback(400, ERROR_MESSAGES.ALREADY_EXIST);
    }

    const hashPassword = helpers.hash(password);

    if (!hashPassword) {
      return callback(400, ERROR_MESSAGES.PASSWORD_HASH);
    }
    const userObject = {
      firstName,
      lastName,
      phone,
      password: hashPassword,
      tosAgreement: true,
    };

    data.create('users', phone, userObject, err => (!err ? callback(200) : callback(500)));
  });
};

// Required data: phone
// Optional data: none
handler.get = ({ query, headers }, callback) => {
  const phone = utils.handleTextInput(query.phone, 10);

  if (!phone) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  const token = typeof headers.token === 'string' ? headers.token : false;

  tokens.verifyToken(token, phone, tokenIsValid => {
    if (!tokenIsValid) {
      return callback(403, ERROR_MESSAGES.MISSING_TOKEN);
    }

    data.read('users', phone, (err, userData) => {
      if (err || !userData) {
        return callback(404);
      }

      const resUser = userData;

      delete resUser.password;
      callback(200, userData);
    });
  });
};

// Required data: phone
// Optional data: firstName, lastName, password (at least one)
handler.put = ({ payload, headers }, callback) => {
  const phone = utils.handleTextInput(payload.phone, 10);
  const firstName = utils.handleTextInput(payload.firstName);
  const lastName = utils.handleTextInput(payload.lastName);
  const password = utils.handleTextInput(payload.password);

  if (!phone) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  if (!firstName && !lastName && !password) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  const token = typeof headers.token === 'string' ? headers.token : false;

  tokens.verifyToken(token, phone, tokenIsValid => {
    if (!tokenIsValid) {
      return callback(403, ERROR_MESSAGES.MISSING_TOKEN);
    }

    data.read('users', phone, (errRead, userData) => {
      if (errRead || !userData) {
        return callback(400, ERROR_MESSAGES.USER_NOT_FOUND);
      }

      const resUser = userData;
      resUser.firstName = firstName || userData.firstName;
      resUser.lastName = lastName || userData.lastName;
      resUser.password = password ? helpers.hash(password) : userData.password;

      data.update('users', phone, userData, err => (!err ? callback(200) : callback(500)));
    });
  });
};

// Required data: phone
// Optional data: none
handler.delete = ({ query, headers }, callback) => {
  const phone = utils.handleTextInput(query.phone, 10);

  if (!phone) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  const token = typeof headers.token === 'string' ? headers.token : false;

  tokens.verifyToken(token, phone, tokenIsValid => {
    if (!tokenIsValid) {
      return callback(403, ERROR_MESSAGES.MISSING_TOKEN);
    }

    data.read('users', phone, (errRead, userData) => {
      if (errRead) {
        return callback(400, ERROR_MESSAGES.USER_NOT_FOUND);
      }

      data.delete('users', phone, err => {
        if (err) {
          callback(500);
        }

        const userChecks =
          typeof userData.checks === 'object' && userData.checks instanceof Array
            ? userData.checks
            : [];

        const checksToDelete = userChecks.length;

        if (checksToDelete === 0) {
          return callback(200);
        }

        if (checksToDelete > 0) {
          let deletionError = false;
          let deletedChecks = 0;
          let errorChecks = 0;
          userChecks.forEach(checkId => {
            data.delete('checks', checkId, errDel => {
              if (errDel) {
                errorChecks += 1;
                deletionError = true;
              } else {
                deletedChecks += 1;
              }

              if (deletionError) {
                return callback(500);
              }

              if (checksToDelete !== deletedChecks) {
                return callback(500);
              }
            });
          });
          return callback(200);
        }
      });
    });
  });
};

module.exports = handler;
