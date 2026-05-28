import React, { useState } from 'react';
import './App.css';

const API_SERVICE1 = process.env.REACT_APP_API_SERVICE1 || '/api/service1';
const API_SERVICE2 = process.env.REACT_APP_API_SERVICE2 || '/api/service2';

function App() {
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
  const [loading, setLoading] = useState({ svc1: false, svc2: false });
  const [error, setError] = useState({ svc1: null, svc2: null });

  // Call chain: Frontend → api-service1 → api-service2 → PostgreSQL
  const callService1 = async () => {
    setLoading(prev => ({ ...prev, svc1: true }));
    setError(prev => ({ ...prev, svc1: null }));
    try {
      const resp = await fetch(`${API_SERVICE1}/info`);
      const data = await resp.json();
      setResult1(data);
    } catch (err) {
      setError(prev => ({ ...prev, svc1: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, svc1: false }));
    }
  };

  // Call chain: Frontend → api-service2 → api-service1 → PostgreSQL
  const callService2 = async () => {
    setLoading(prev => ({ ...prev, svc2: true }));
    setError(prev => ({ ...prev, svc2: null }));
    try {
      const resp = await fetch(`${API_SERVICE2}/info`);
      const data = await resp.json();
      setResult2(data);
    } catch (err) {
      setError(prev => ({ ...prev, svc2: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, svc2: false }));
    }
  };

  const callBoth = () => {
    callService1();
    callService2();
  };

  const renderResult = (data, serviceName) => {
    if (!data) return null;
    return (
      <div className="result-card">
        <h3>{serviceName} Response</h3>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔭 Cloud Native Observability Demo</h1>
        <p className="subtitle">
          Istio + OpenTelemetry + Jaeger + Prometheus + Loki + Grafana
        </p>
      </header>

      <div className="architecture">
        <h2>📐 调用链路 (Call Chains)</h2>
        <div className="chains">
          <div className="chain-card">
            <h3>链路 A</h3>
            <div className="chain-flow">
              <span className="node frontend">Frontend</span>
              <span className="arrow">→</span>
              <span className="node svc1">api-service1</span>
              <span className="arrow">→</span>
              <span className="node svc2">api-service2</span>
              <span className="arrow">→</span>
              <span className="node db">PostgreSQL</span>
            </div>
          </div>
          <div className="chain-card">
            <h3>链路 B</h3>
            <div className="chain-flow">
              <span className="node frontend">Frontend</span>
              <span className="arrow">→</span>
              <span className="node svc2">api-service2</span>
              <span className="arrow">→</span>
              <span className="node svc1">api-service1</span>
              <span className="arrow">→</span>
              <span className="node db">PostgreSQL</span>
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button onClick={callBoth} disabled={loading.svc1 || loading.svc2}>
          🚀 同时调用两条链路 (Call Both)
        </button>
        <button onClick={callService1} disabled={loading.svc1}>
          {loading.svc1 ? '⏳ Loading...' : '📡 链路 A: service1 → service2 → DB'}
        </button>
        <button onClick={callService2} disabled={loading.svc2}>
          {loading.svc2 ? '⏳ Loading...' : '📡 链路 B: service2 → service1 → DB'}
        </button>
      </div>

      <div className="results">
        {error.svc1 && <div className="error">❌ Service1 Error: {error.svc1}</div>}
        {error.svc2 && <div className="error">❌ Service2 Error: {error.svc2}</div>}
        {result1 && renderResult(result1, 'api-service1')}
        {result2 && renderResult(result2, 'api-service2')}
      </div>

      <footer className="footer">
        <h2>🔗 可观测性面板 (Observability Dashboards)</h2>
        <div className="links">
          <a href="http://localhost:30090" target="_blank" rel="noreferrer" className="link-card grafana">
            📊 Grafana
          </a>
          <a href="http://localhost:30091" target="_blank" rel="noreferrer" className="link-card jaeger">
            🔍 Jaeger
          </a>
          <a href="http://localhost:30092" target="_blank" rel="noreferrer" className="link-card prometheus">
            📈 Prometheus
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
