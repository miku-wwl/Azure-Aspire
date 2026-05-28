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
  defaultMeta: { service: 'api-service2' },
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 3002;

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
  res.json({ status: 'healthy', service: 'api-service2', timestamp: new Date().toISOString() });
});

// ── Main endpoint: calls api-service1 + queries PostgreSQL ────────────────
app.get('/api/service2/info', async (req, res) => {
  const startTime = Date.now();
  logger.info('GET /api/service2/info called', {
    traceId: req.headers['x-b3-traceid'] || req.headers['traceparent'] || 'N/A',
    spanId: req.headers['x-b3-spanid'] || 'N/A',
  });

  try {
    // Call api-service1 to form the reverse call chain
    let service1Data = null;
    let service1Error = null;
    try {
      const svc1Resp = await axios.get('http://api-service1:3001/api/service1/chain', {
        timeout: 5000,
        httpAgent,
        headers: {
          'x-request-id': req.headers['x-request-id'] || 'svc2-'+Date.now(),
          'Connection': 'close',
        },
      });
      service1Data = svc1Resp.data;
      logger.info('Successfully called api-service1');
    } catch (err) {
      service1Error = err.message;
      logger.error('Failed to call api-service1', { error: err.message });
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
      service: 'api-service2',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      elapsedMs: elapsed,
      downstream: {
        apiService1: service1Data || { error: service1Error },
        postgres: dbData ? { connected: true, rows: dbData } : { connected: false, error: dbError },
      },
    });
  } catch (error) {
    logger.error('Unexpected error', { error: error.message, stack: error.stack });
    res.status(500).json({ service: 'api-service2', error: error.message });
  }
});

// ── Chain endpoint (called by api-service1, queries DB only - no callback) ──
app.get('/api/service2/chain', async (req, res) => {
  logger.info('GET /api/service2/chain called (DB only)', {
    traceId: req.headers['x-b3-traceid'] || 'N/A',
  });
  try {
    const result = await pool.query('SELECT id, name, value, created_at FROM demo_data ORDER BY created_at DESC LIMIT 5');
    res.json({ service: 'api-service2', chain: true, dbRows: result.rowCount, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Direct data endpoint ──────────────────────────────────────────────────
app.get('/api/service2/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, value, created_at FROM demo_data ORDER BY id');
    res.json({ service: 'api-service2', count: result.rowCount, data: result.rows });
  } catch (error) {
    logger.error('Database query failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ── Seed endpoint ─────────────────────────────────────────────────────────
app.post('/api/service2/seed', async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO demo_data (name, value) VALUES 
      ('demo-item-3', 'value-from-service2'),
      ('demo-item-4', 'value-from-service2')
      ON CONFLICT DO NOTHING
    `);
    res.json({ status: 'seeded', service: 'api-service2' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  logger.info(`api-service2 started`, { port: PORT });
});
