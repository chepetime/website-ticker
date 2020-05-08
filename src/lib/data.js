const fs = require('fs');
const path = require('path');
const helpers = require('./helpers.js');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data/');

const ERROR_MESSAGES_CREATE = {
  create: 'Could not create new file, it may already exist',
  write: 'Error writing to file',
  close: 'Error closing file',
};

const ERROR_MESSAGES_READ = {
  read: 'Error reading the file',
};

const ERROR_MESSAGES_UPDATE = {
  open: 'Could not open file for updating, it may not exist yet',
  truncate: 'Error truncating file',
  write: 'Error writing to existing file',
  close: 'Error closing existing file',
};

const ERROR_MESSAGES_DELETE = {
  unlink: 'Error unlinking the file, it may not exist',
};

const filePath = (dir, file) => `${lib.baseDir}${dir}/${file}.json`;

lib.create = (dir, file, data, callback) => {
  fs.open(filePath(dir, file), 'wx', (err, fileDescriptor) => {
    if (err || !fileDescriptor) {
      return callback(ERROR_MESSAGES_CREATE.create);
    }
    fs.writeFile(fileDescriptor, JSON.stringify(data), errWrite => {
      if (errWrite) {
        return callback(ERROR_MESSAGES_CREATE.write);
      }
      fs.close(fileDescriptor, errClose => {
        callback(errClose ? ERROR_MESSAGES_CREATE.close : false);
      });
      return false;
    });
    return false;
  });
  return false;
};

lib.read = (dir, file, callback) => {
  fs.readFile(filePath(dir, file), 'utf8', (err, data) => {
    if (!err && data) {
      callback(false, helpers.parseJsonToObject(data));
    } else {
      callback(ERROR_MESSAGES_READ, err);
    }
  });
};

lib.update = (dir, file, data, callback) => {
  fs.open(filePath(dir, file), 'r+', (err, fileDescriptor) => {
    if (err || !fileDescriptor) {
      callback(ERROR_MESSAGES_UPDATE.open);
      return false;
    }
    fs.ftruncate(fileDescriptor, errTruncate => {
      if (errTruncate) {
        callback(ERROR_MESSAGES_UPDATE.truncate);
        return false;
      }
      fs.writeFile(fileDescriptor, JSON.stringify(data), errWrite => {
        if (errWrite) {
          callback(ERROR_MESSAGES_UPDATE.write);
          return false;
        }
        fs.close(fileDescriptor, errClose => {
          callback(errClose ? ERROR_MESSAGES_UPDATE.close : false);
        });
        return false;
      });
      return false;
    });
    return false;
  });
  return false;
};

lib.delete = (dir, file, callback) => {
  fs.unlink(filePath(dir, file), err => {
    callback(err ? ERROR_MESSAGES_DELETE.unlink : false);
  });
};

lib.list = (dir, callback) => {
  fs.readdir(`${lib.baseDir + dir}/`, (err, data) => {
    if (err) {
      return callback(err, data);
    }

    if (!err && data && data.length > 0) {
      const trimmedFilenames = data
        .map(filename => filename.replace('.json', ''))
        .filter(el => el[0] !== '.');
      callback(false, trimmedFilenames);
    }
  });
};

module.exports = lib;
