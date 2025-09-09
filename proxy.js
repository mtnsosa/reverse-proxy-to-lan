const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const httpProxy = require('http-proxy');
require('dotenv').config();

function getEnvBool(name, def = false) {
  const v = process.env[name];
  if (v == null) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

// ---------- Config ----------
const TARGET_URL = process.env.TARGET_URL;
if (!TARGET_URL) {
  console.error('ERROR: Debes especificar TARGET_URL en tu archivo .env');
  process.exit(1);
}
const parsedTarget = new url.URL(TARGET_URL);

const LISTEN_PORT = Number(process.env.LISTEN_PORT || 8080);
const LISTEN_HOST = process.env.LISTEN_HOST || '0.0.0.0';

const CHANGE_ORIGIN = getEnvBool('CHANGE_ORIGIN', true);
const PRESERVE_HOST = getEnvBool('PRESERVE_HOST', false);
const ENABLE_CORS   = getEnvBool('ENABLE_CORS', false);

const TLS_CERT = process.env.TLS_CERT || '';
const TLS_KEY  = process.env.TLS_KEY  || '';

const useHttps = TLS_CERT && TLS_KEY && fs.existsSync(TLS_CERT) && fs.existsSync(TLS_KEY);

// ---------- Proxy ----------
const proxy = httpProxy.createProxyServer({
  target: TARGET_URL,
  changeOrigin: CHANGE_ORIGIN && !PRESERVE_HOST,
  xfwd: true,
  ws: true,
  secure: false,
});

proxy.on('error', (err, req, res) => {
  console.error('[proxy:error]', err.message);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
  }
  res.end(JSON.stringify({ error: 'Bad Gateway', detail: err.message }));
});

function addCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, *');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function requestHandler(req, res) {
  if (req.url === '/_health') {
    if (ENABLE_CORS) addCors(res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, target: TARGET_URL }));
  }

  if (ENABLE_CORS && req.method === 'OPTIONS') {
    addCors(res);
    res.writeHead(204);
    return res.end();
  }

  if (!PRESERVE_HOST) {
    req.headers.host = parsedTarget.host;
  }

  if (ENABLE_CORS) {
    res.oldWriteHead = res.writeHead;
    res.writeHead = function (...args) {
      addCors(res);
      return res.oldWriteHead.apply(this, args);
    };
  }

  proxy.web(req, res, { target: TARGET_URL });
}

let server;
if (useHttps) {
  const opts = {
    cert: fs.readFileSync(TLS_CERT),
    key: fs.readFileSync(TLS_KEY),
  };
  server = https.createServer(opts, requestHandler);
  console.log(`→ Listener HTTPS habilitado`);
} else {
  server = http.createServer(requestHandler);
  console.log('→ Listener HTTP habilitado');
}

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: TARGET_URL });
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log('========================================');
  console.log(' Reverse Proxy listo (config desde .env)');
  console.log('----------------------------------------');
  console.log('  Target  :', TARGET_URL);
  console.log('  Listen  :', `${useHttps ? 'https' : 'http'}://${LISTEN_HOST}:${LISTEN_PORT}`);
  console.log('  CORS    :', ENABLE_CORS ? 'ON' : 'OFF');
  console.log('  Host hdr:', PRESERVE_HOST ? 'Preserve client Host' : (CHANGE_ORIGIN ? 'Set target Host' : 'As-is'));
  console.log('  Health  :', '/_health');
  console.log('========================================');
});