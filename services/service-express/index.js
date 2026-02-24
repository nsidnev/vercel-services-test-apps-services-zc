const express = require('express');

const app = express();
const router = express.Router();

const SERVICE_ENV_MAP = {
  fastapi: 'SERVICE_FASTAPI_URL',
  flask: 'SERVICE_FLASK_URL',
  express: 'SERVICE_EXPRESS_URL',
};

router.post('/chain', async (req, res) => {
  const services = req.body.services || [];
  let next = null;

  if (services.length > 0) {
    const [nextService, ...remaining] = services;
    const envVar = SERVICE_ENV_MAP[nextService];
    const url = envVar ? process.env[envVar] : null;

    if (url) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
        if (bypass) headers['x-vercel-protection-bypass'] = bypass;
        const resp = await fetch(`${url}/chain`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ services: remaining }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        next = await resp.json();
      } catch (e) {
        next = { error: e.message, service: nextService };
      }
    } else {
      next = { error: `No URL configured for ${nextService}`, service: nextService };
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    service: 'express',
    next,
  });
});

router.get('/', (req, res) => {
  res.json({
    service: 'express',
    timestamp: new Date().toISOString(),
    message: 'Hello from Express!',
  });
});

app.use(express.json());
app.use(process.env.VERCEL_SERVICE_ROUTE_PREFIX, router);

module.exports = app;
