const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const http = require('http');
const winston = require('winston');

// HTTP agent with keep-alive disabled (works better with Istio sidecar)
const httpAgent = new http.Agent({ keepAlive: false });

// ── Logger with JSON format (structured logging) ──────────────────────────
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-service1' },
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 3001;

// ── PostgreSQL connection pool ────────────────────────────────────────────
const pool = new Pool({
  host: process.env.PG_HOST || 'postgres.demo-app.svc.cluster.local',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'devuser',
  password: process.env.PG_PASSWORD || 'devpass',
  database: process.env.PG_DB || 'devdb',
  connectionTimeoutMillis: 5000,
});

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-service1', timestamp: new Date().toISOString() });
});

// ── Main endpoint: calls api-service2 + queries PostgreSQL ────────────────
app.get('/api/service1/info', async (req, res) => {
  const startTime = Date.now();
  logger.info('GET /api/service1/info called', {
    traceId: req.headers['x-b3-traceid'] || req.headers['traceparent'] || 'N/A',
    spanId: req.headers['x-b3-spanid'] || 'N/A',
  });

  try {
    // Call api-service2 to form a complete trace chain
    let service2Data = null;
    let service2Error = null;
    try {
      const svc2Resp = await axios.get('http://api-service2:3002/api/service2/chain', {
        timeout: 5000,
        httpAgent,
        headers: {
          'x-request-id': req.headers['x-request-id'] || 'svc1-'+Date.now(),
          'Connection': 'close',
        },
      });
      service2Data = svc2Resp.data;
      logger.info('Successfully called api-service2');
    } catch (err) {
      service2Error = err.message;
      logger.error('Failed to call api-service2', { error: err.message });
    }

    // Query PostgreSQL
    let dbData = null;
    let dbError = null;
    try {
      const dbResult = await pool.query(`
        SELECT id, name, value, created_at 
        FROM demo_data 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      dbData = dbResult.rows;
      logger.info('Successfully queried PostgreSQL', { rowCount: dbResult.rowCount });
    } catch (err) {
      dbError = err.message;
      logger.error('Failed to query PostgreSQL', { error: err.message });
    }

    const elapsed = Date.now() - startTime;
    res.json({
      service: 'api-service1',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      elapsedMs: elapsed,
      downstream: {
        apiService2: service2Data || { error: service2Error },
        postgres: dbData ? { connected: true, rows: dbData } : { connected: false, error: dbError },
      },
    });
  } catch (error) {
    logger.error('Unexpected error', { error: error.message, stack: error.stack });
    res.status(500).json({ service: 'api-service1', error: error.message });
  }
});

// ── Direct data endpoint ──────────────────────────────────────────────────
app.get('/api/service1/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, value, created_at FROM demo_data ORDER BY id');
    res.json({ service: 'api-service1', count: result.rowCount, data: result.rows });
  } catch (error) {
    logger.error('Database query failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ── Chain endpoint (called by api-service2, queries DB only - no callback) ──
app.get('/api/service1/chain', async (req, res) => {
  logger.info('GET /api/service1/chain called (DB only)', {
    traceId: req.headers['x-b3-traceid'] || 'N/A',
  });
  try {
    const result = await pool.query('SELECT id, name, value, created_at FROM demo_data ORDER BY created_at DESC LIMIT 5');
    res.json({ service: 'api-service1', chain: true, dbRows: result.rowCount, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Seed endpoint (for demo purposes) ─────────────────────────────────────
app.post('/api/service1/seed', async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO demo_data (name, value) VALUES 
      ('demo-item-1', 'value-from-service1'),
      ('demo-item-2', 'value-from-service1')
      ON CONFLICT DO NOTHING
    `);
    res.json({ status: 'seeded', service: 'api-service1' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  logger.info(`api-service1 started`, { port: PORT });
});
