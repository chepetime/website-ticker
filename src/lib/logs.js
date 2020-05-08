/* eslint-disable consistent-return */
/* eslint-disable no-plusplus */
/**
 * Logs
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.logs/');

lib.append = (file, str, callback) => {
  fs.open(`${lib.baseDir + file}.log`, 'a', (err, fileDescriptor) => {
    if (err || !fileDescriptor) {
      return callback('Could not open file for appending');
    }

    if (fileDescriptor) {
      fs.appendFile(fileDescriptor, `${str}\n`, (errAppending) => {
        if (errAppending) {
          return callback('Error appending the file');
        }
        fs.close(fileDescriptor, (errClose) => {
          if (errClose) {
            return callback('Error appending the file');
          }
          return callback(false);
        });
      });
    }
  });
};

lib.list = (showCompressed, callback) => {
  fs.readdir(lib.baseDir, (errReaddir, data) => {
    if (errReaddir || !data) {
      return callback(errReaddir, data);
    }

    const trimmedFileNames = data
      .map((fileName) => {
        if (fileName.indexOf('.log') > 1) {
          return fileName.replace('.log', '');
        }
        if (fileName.indexOf('.gz.b64') > 1 && showCompressed) {
          return fileName.replace('.gz.b64', '');
        }

        return false;
      })
      .filter((el) => !!el);

    return callback(false, trimmedFileNames);
  });
};

lib.compress = (id, newFile, callback) => {
  const sourceFile = `${id}.log`;
  const destFile = `${newFile}.gz.bs4`;

  fs.readFile(`${lib.baseDir + sourceFile}`, 'utf8', (errRead, inputString) => {
    if (errRead) {
      return callback(errRead);
    }
    zlib.gzip(inputString, (errGzip, buffer) => {
      if (errGzip || !buffer) {
        return callback(errGzip);
      }
      return fs.open(`${lib.baseDir + destFile}`, 'wx', (errOpen, fileDescriptor) => {
        if (errOpen || !fileDescriptor) {
          return callback(errOpen);
        }
        return fs.writeFile(fileDescriptor, buffer.toString('base64'), (errWrite) => {
          if (errWrite) {
            return callback(errWrite);
          }
          return fs.close(fileDescriptor, (errClose) => {
            if (errClose) {
              return callback(errClose);
            }

            return callback(false);
          });
        });
      });
    });
  });
};

lib.decompress = (id, callback) => {
  const filename = `${id}.gz.bs4`;
  fs.readFile(`${lib.baseDir + filename}`, 'utf8', (errRead, str) => {
    if (errRead || !str) {
      return callback(errRead);
    }

    const inputBuffer = Buffer.from(str, 'base64');
    return zlib.unzip(inputBuffer, (errUnzip, outputBuffer) => {
      if (errUnzip || !outputBuffer) {
        return callback(errUnzip);
      }

      return callback(false, outputBuffer.toString());
    });
  });
};

lib.truncate = (id, callback) => {
  return fs.truncate(`${lib.baseDir + id}.log`, 0, (errTruncate) => callback(errTruncate || false));
};

module.exports = lib;
