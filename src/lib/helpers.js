/* eslint-disable no-plusplus */
/**
 * Helpers for various tasks
 */

const querystring = require('querystring');
const https = require('https');
const crypto = require('crypto');
const utils = require('./utils.js');
const config = require('./config.js');

const helpers = {};

helpers.hash = (password) => {
  return typeof password === 'string' && password.length > 0
    ? crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex')
    : false;
};

helpers.parseJsonToObject = (str) => {
  try {
    return JSON.parse(str);
  } catch (err) {
    return false;
  }
};

helpers.createRandomString = (strLength = 20) => {
  if (typeof strLength !== 'number' || strLength <= 0) {
    return false;
  }

  const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';

  let str = '';

  for (let i = 0; i < strLength; i++) {
    str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
  }

  return str;
};

helpers.sendTwillioSms = (phone, msg, callback) => {
  const userPhone = utils.handleTextInput(phone, 10);
  const userMsg = utils.handleTextInput(msg, 0, 1600);

  if (!userPhone || !userMsg) {
    return callback('Given params were missing of invalid');
  }

  const payload = {
    From: config.twilio.fromPhone,
    To: `+5201${userPhone}`,
    Body: userMsg,
  };

  const stringPayLoad = querystring.stringify(payload);
  const requestDetails = {
    protocol: 'https:',
    hostname: 'api.twilio.com',
    method: 'POST',
    path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
    auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(stringPayLoad),
    },
  };

  const req = https.request(requestDetails, (res) => {
    const status = res.statusCode;
    if (status === 200 || status === 201) {
      return callback(false);
    }
    return callback(status);
  });

  req.on('error', (e) => {
    return callback(e);
  });

  req.write(stringPayLoad);

  req.end();

  return false;
};

module.exports = helpers;
