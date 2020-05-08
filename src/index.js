const server = require('./lib/server.js');
const workers = require('./lib/workers.js');

const app = {};

app.init = () => {
  server.init();
  workers.init();
};

app.init();

module.exports = app;
