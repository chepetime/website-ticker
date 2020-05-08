/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
const data = require('../lib/data');
const helpers = require('../lib/helpers.js');
const utils = require('../lib/utils.js');

const handler = {
  name: 'tokens',
};

const ERROR_MESSAGES = {
  GENERIC: { Error: 'General Error' },
  MISSING_FIELDS: { Error: 'Missing required field(s).' },
  USER_NOT_FOUND: { Error: 'User not found.' },
  WRONG_PASSWORD: { Error: 'Wrong password.' },
  CREATE_ERROR: { Error: 'Cound not create token.' },
  TOKEN_WRONG: { Error: 'Specified token does not exist.' },
  TOKEN_EXPIRED: { Error: 'Specified token has expired.' },
};

// Required data: phone, password
// Optional data: none
handler.post = ({ payload }, callback) => {
  const phone = utils.handleTextInput(payload.phone);
  const password = utils.handleTextInput(payload.password);

  if (!phone || !password) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  data.read('users', phone, (errRead, userData) => {
    if (errRead) {
      return callback(400, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (userData.password !== helpers.hash(password)) {
      return callback(400, ERROR_MESSAGES.WRONG_PASSWORD);
    }

    const id = helpers.createRandomString(20);
    const expires = Date.now() + 1000 * 60 * 60;
    const tokenObject = { phone, id, expires };

    data.create('tokens', id, tokenObject, err =>
      !err ? callback(200, tokenObject) : callback(500, ERROR_MESSAGES.WRONG_PASSWORD)
    );
    return false;
  });
  return false;
};

// Required data: id
// Optional data: none
handler.get = ({ query }, callback) => {
  const tokenId = utils.handleTextInput(query.id, 20);

  if (!tokenId) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  data.read('tokens', tokenId, (err, tokenData) =>
    !err && tokenData ? callback(200, tokenData) : callback(404)
  );

  return false;
};

// Required data: id, extend
// Optional data: none
handler.put = ({ payload }, callback) => {
  const tokenId = utils.handleTextInput(payload.id, 20);
  const extend = utils.handleTextBoolean(payload.extend);

  if (!tokenId || !extend) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  data.read('tokens', tokenId, (errRead, tokenData) => {
    if (errRead) {
      return callback(400, ERROR_MESSAGES.TOKEN_WRONG);
    }

    if (tokenData.expires <= Date.now()) {
      return callback(400, ERROR_MESSAGES.TOKEN_EXPIRED);
    }

    const newToken = {
      ...tokenData,
      expires: Date.now() + 1000 * 60 * 60,
    };

    data.update('tokens', tokenId, tokenData, err => (!err ? callback(200) : callback(500)));

    return false;
  });
  return false;
};

// Required data: id
// Optional data: none
handler.delete = ({ query }, callback) => {
  const tokenId = utils.handleTextInput(query.id, 20);

  if (!tokenId) {
    return callback(400, ERROR_MESSAGES.MISSING_FIELDS);
  }

  data.read('tokens', tokenId, (errRead, tokenData) => {
    if (errRead) {
      return callback(400, ERROR_MESSAGES.TOKEN_WRONG);
    }
    data.delete('tokens', tokenId, err => (!err ? callback(200) : callback(500)));
    return false;
  });
  return false;
};

// Check if valid for an user
handler.verifyToken = (tokenId, phone, callback) => {
  data.read('tokens', tokenId, (err, tokenData) => {
    if (err || !tokenData) {
      return callback(false);
    }

    if (tokenData.phone === phone && tokenData.expires > Date.now()) {
      callback(true);
    } else {
      callback(false);
    }

    return false;
  });
  return false;
};

module.exports = handler;
