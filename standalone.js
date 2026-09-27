const path = require('path');
const { startServer } = require('./app');
const dataDir = process.env.EGB_DATA_DIR || path.join(process.cwd(), 'egb-data');
startServer({ dataDir, port: Number(process.env.PORT || 3008), publicHost: process.env.HOST || '0.0.0.0' })
  .then(s => console.log(`EGB Atelier server listening on ${s.baseUrl}`))
  .catch(err => { console.error(err); process.exit(1); });
