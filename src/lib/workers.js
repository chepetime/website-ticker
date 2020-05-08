/* eslint-disable no-console */

// const path = require('path');
// const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const util = require('util');

const debug = util.debuglog('workers');

const utils = require('./utils');
const data = require('./data');
const helpers = require('./helpers');
const logs = require('./logs');

const workers = {};

workers.alertUserStatusChange = (newCheckData) => {
  const message = ` Alert: Your check for ${newCheckData.method.toUpperCase} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwillioSms(newCheckData.phone, message, (err) => {
    if (!err) {
      debug('Success, user was alerted to a status change.', message);
    } else {
      debug('Error, user wasn`t alerted', message);
    }
  });
};

workers.processCheckOutcome = (check, checkOutcome) => {
  // Decide if the check is UP or DOWN
  const state =
    !checkOutcome.error && check.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

  // Decide if an alert is warranted
  const alertWarranted = check.lastCheck && check.state !== state;
  debug(check.id);

  // Update check data
  const newCheckData = check;
  newCheckData.state = state;
  newCheckData.lastCheck = Date.now();

  workers.log(check, checkOutcome, state, alertWarranted, newCheckData.lastCheck);

  data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (err) {
      debug('Couldn`t update check');
    } else {
      // debug('Sending check to next step');
      if (alertWarranted) {
        workers.alertUserStatusChange(newCheckData);
      }
      if (!alertWarranted) {
        // debug(check);
      }
    }
  });
};

// Perform the check, send the check and the outcome to the next step in the process
workers.performCheck = (check) => {
  const { protocol, method, timeoutSecs } = check;

  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the check data
  const parsedURL = url.parse(`${protocol}://${check.url}`);
  const { hostname, path } = parsedURL; // using path because we want any query string

  const requestDetails = {
    protocol: `${protocol}:`,
    hostname,
    method: method.toUpperCase(),
    path,
    timeout: timeoutSecs * 1000,
  };

  const moduleToUse = protocol === 'http' ? http : https;
  const req = moduleToUse.request(requestDetails, (res) => {
    checkOutcome.responseCode = res.statusCode;
    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('error', (e) => {
    checkOutcome.error = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('timeout', (e) => {
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(check, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
};

workers.validateCheckData = (check) => {
  const validCheck = utils.handleObjectInput(check) || {};
  validCheck.id = utils.handleTextInput(validCheck.id, 20);
  validCheck.phone = utils.handleTextInput(validCheck.phone, 10);
  validCheck.protocol = utils.handleTextInputValid(validCheck.protocol, ['http', 'https']);
  validCheck.url = utils.handleTextInput(validCheck.url, 0);
  validCheck.method = utils.handleTextInputValid(validCheck.method, [
    'post',
    'get',
    'put',
    'delete',
  ]);
  validCheck.successCodes = utils.handleArrayInput(validCheck.successCodes);
  validCheck.timeoutSecs = utils.handleNumberInput(validCheck.timeoutSecs, 1, 5);

  // Set the keys that may not be set (if the worker have never seen this check)
  validCheck.state = utils.handleTextInputValid(validCheck.state, ['up', 'down']) || 'down';
  validCheck.lastCheck = utils.handleNumberInput(validCheck.lastCheck, 0) || false;

  // If all the checks pass, pass the data along to the next step in the process
  if (
    validCheck.id &&
    validCheck.phone &&
    validCheck.protocol &&
    validCheck.url &&
    validCheck.method &&
    validCheck.successCodes &&
    validCheck.timeoutSecs
  ) {
    workers.performCheck(validCheck);
  } else {
    debug('Once of the checks is not properly formatted. Skipping it.');
  }
};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      debug(`Processing ${checks.length} checks`);
      checks.forEach((check) => {
        // Real in the check data
        data.read('checks', check, (errCheck, checkData) => {
          if (!errCheck && checkData) {
            // Pass the data to the check validador, and let htat function continue or log errors as needed
            workers.validateCheckData(checkData);
          } else {
            debug('Error reading one of the checks');
          }
        });
      });
    } else {
      debug('Error: could not find any checks to process');
    }
  });
};

workers.log = (check, outcome, state, alert, time) => {
  const logString = JSON.stringify({ check, outcome, state, alert, time });
  logs.append(check.id, logString, (err) => {
    if (!err) {
      // debug('Logging to file succedded');
    } else {
      debug('Logging to file failed');
    }
  });
};

// Timer to execute the worker-process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

workers.rotateLogs = () => {
  // List all the non compressed logs files
  logs.list(false, (err, logList) => {
    if (err) {
      return debug('Error');
    }
    if (logs.length < 1) {
      return debug('No logs found');
    }
    logList.forEach((el) => {
      const logId = el.replace('.log', '');
      const newFileId = `${logId}-${Date.now()}`;
      logs.compress(logId, newFileId, (errCompress) => {
        if (errCompress) {
          return debug('Error');
        }
        logs.truncate(logId, (errTruncate) => {
          if (errTruncate) {
            return debug('Error');
          }
          return false;
        });
      });
    });
  });
};

workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

workers.init = () => {
  // send to console in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

  // Execute all the checks inmmediately
  workers.gatherAllChecks();
  // Call the loop so the checks will execute later on
  workers.loop();

  workers.rotateLogs();

  workers.logRotationLoop();
};

module.exports = workers;
