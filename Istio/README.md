# 🔭 Cloud Native Observability Demo — 验证手册

> **环境**: VMware VM `192.168.199.130` | **架构**: Istio + OTel Collector + Jaeger + Prometheus + Loki + Grafana

---

## 📐 架构概览

```
Browser → Istio Gateway (:30132) → Frontend (nginx) → api-service1 (:3001) → api-service2 (:3002) → PostgreSQL (:5432)
                                      │                        │                      │
                                Istio Sidecar            Istio Sidecar          Istio Sidecar
                                      │                        │                      │
                                      └────────────┬───────────┴──────────────────────┘
                                                   │
                                          Envoy Zipkin Tracer
                                                   │
                                          OTel Collector (:9411)
                                          ┌────────┼────────┐
                                          │        │        │
                                       Jaeger  Prometheus  Loki
                                      (:30091)  (:30092)  (:3100)
                                          └────────┼────────┘
                                                Grafana
                                               (:30090)
```

## 🔗 两条调用链路

| 链路 | 流程 | 预期耗时 |
|------|------|---------|
| **A** | Frontend → api-service1 → api-service2/chain → PostgreSQL | < 50ms |
| **B** | Frontend → api-service2 → api-service1/chain → PostgreSQL | < 50ms |

---

## 🧪 验证方式

### 方式一：浏览器验证（推荐）

| 面板 | URL | 验证操作 |
|------|-----|---------|
| 📱 Frontend | `http://192.168.199.130:30132` | 点击 **"同时调用两条链路"** 按钮，查看 JSON 响应 |
| 🔍 Jaeger | `http://192.168.199.130:30091` | Service 下拉选 `api-service1.demo-app` → Find Traces |
| 📊 Grafana | `http://192.168.199.130:30090` | Explore → 切换 Jaeger / Prometheus / Loki |
| 📈 Prometheus | `http://192.168.199.130:30092` | 查询 `istio_requests_total` |

---

### 方式二：cURL 命令行验证

在任意能访问 `192.168.199.130` 的机器上执行：

```bash
NODE=192.168.199.130

# ============ 1. 两条调用链 ============

# 链路 A：Frontend → svc1 → svc2 → PostgreSQL
echo "=== 链路 A ==="
curl -s http://$NODE:30132/api/service1/info | python3 -m json.tool | head -15

# 链路 B：Frontend → svc2 → svc1 → PostgreSQL
echo "=== 链路 B ==="
curl -s http://$NODE:30132/api/service2/info | python3 -m json.tool | head -15

# ============ 2. Jaeger 追踪 ============

echo "=== Jaeger Services ==="
curl -s http://$NODE:30091/api/services | python3 -m json.tool

echo "=== Traces ==="
curl -s "http://$NODE:30091/api/traces?service=api-service1.demo-app&limit=3&lookback=1h" | python3 -m json.tool | head -30

# ============ 3. Prometheus 指标 ============

echo "=== Prometheus ==="
curl -s "http://$NODE:30092/api/v1/query?query=istio_requests_total" | python3 -m json.tool | head -20

# ============ 4. Grafana 健康检查 ============

echo "=== Grafana ==="
curl -s http://$NODE:30090/api/health | python3 -m json.tool

# ============ 5. Loki 就绪检查 ============

echo "=== Loki ==="
curl -s http://$NODE:3100/ready
```

---

### 方式三：在 VM 内部验证

```bash
# SSH 到 VM
ssh miku@192.168.199.130

# 查看所有 Pod 状态
kubectl get pods -n demo-app
kubectl get pods -n observability

# 查看 OTel Collector 数据流入
kubectl logs -n observability deploy/otel-collector --tail=10 | grep TracesExporter

# 查看微服务日志
kubectl logs -n demo-app deploy/api-service1 -c api-service1 --tail=20
kubectl logs -n demo-app deploy/api-service2 -c api-service2 --tail=20
```

---

## ✅ 预期结果（8 项检查）

### 1. 调用链路 A

**命令**:
```bash
curl -s http://192.168.199.130:30132/api/service1/info | python3 -c "import sys,json; d=json.load(sys.stdin); print('elapsed:', d['elapsedMs'], 'ms')"
```

**预期输出**:
```
elapsed: <50 ms
```

**预期 JSON**:
```json
{
  "service": "api-service1",
  "version": "1.0.0",
  "elapsedMs": 18,
  "downstream": {
    "apiService2": { "service": "api-service2", "chain": true, "dbRows": 5, "data": [...] },
    "postgres": { "connected": true, "rows": [...] }
  }
}
```

✅ **通过条件**: HTTP 200 + elapsedMs < 100 + apiService2.chain == true + postgres.connected == true

---

### 2. 调用链路 B

**命令**:
```bash
curl -s http://192.168.199.130:30132/api/service2/info | python3 -c "import sys,json; d=json.load(sys.stdin); print('elapsed:', d['elapsedMs'], 'ms')"
```

**预期输出**:
```
elapsed: <50 ms
```

✅ **通过条件**: HTTP 200 + elapsedMs < 100 + apiService1.chain == true + postgres.connected == true

---

### 3. Jaeger（分布式追踪）

**命令**:
```bash
# 查看服务列表
curl -s http://192.168.199.130:30091/api/services | python3 -m json.tool

# 查看 Trace
curl -s "http://192.168.199.130:30091/api/traces?service=api-service1.demo-app&limit=3&lookback=1h" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for t in (d.get('data') or []):
    print(f'TraceID: {t[\"traceID\"][:16]}... spans: {len(t[\"spans\"])}')
"
```

**预期输出**:
```json
{ "data": ["api-service1.demo-app", "jaeger-all-in-one"], "total": 2 }
```
```
TraceID: 944f4d50c1c12486... spans: 1
TraceID: 1fd09d60eab9e5d2... spans: 1
```

✅ **通过条件**: 服务列表含 `api-service1.demo-app` + 查询返回 ≥ 1 条 Trace

---

### 4. Prometheus（指标采集）

**命令**:
```bash
curl -s "http://192.168.199.130:30092/api/v1/query?query=istio_requests_total" | python3 -c "
import sys,json
d=json.load(sys.stdin)
results=d['data']['result']
print(f'istio_requests_total series: {len(results)}')
for r in results[:5]:
    svc=r['metric'].get('destination_service_name','?')
    print(f'  {svc} = {r[\"value\"][1]}')
"
```

**预期输出**:
```
istio_requests_total series: > 100
  frontend = xxx
  api-service1 = xxx
  api-service2 = xxx
  PassthroughCluster = xxx
```

✅ **通过条件**: 系列数 > 50 + 包含 `api-service1` 和 `api-service2`

---

### 5. Grafana（统一可视化）

**命令**:
```bash
curl -s http://192.168.199.130:30090/api/health | python3 -m json.tool
curl -s http://192.168.199.130:30090/api/datasources | python3 -c "
import sys,json
for ds in json.load(sys.stdin):
    print(f'{ds[\"name\"]} ({ds[\"type\"]})')
"
```

**预期输出**:
```json
{ "database": "ok", "version": "11.0.0" }
```
```
Jaeger (jaeger)
Loki (loki)
Prometheus (prometheus)
```

✅ **通过条件**: database: ok + 含 Jaeger / Prometheus / Loki 三个数据源

---

### 6. Loki（日志聚合）

**命令**:
```bash
curl -s http://192.168.199.130:3100/ready
```

**预期输出**:
```
Ready
```

✅ **通过条件**: 返回 `Ready`

---

### 7. OpenTelemetry Collector（数据管道）

**命令**:
```bash
kubectl logs -n observability deploy/otel-collector --tail=20 2>/dev/null | grep -E "TracesExporter|MetricsExporter|LogsExporter"
```

**预期输出**:
```
TracesExporter ... "resource spans": N, "spans": M
MetricsExporter ... "resource metrics": N
```

✅ **通过条件**: TracesExporter 日志包含 `"spans": N`（N > 0）

---

### 8. Pod 健康状态

**命令**:
```bash
kubectl get pods -n demo-app
kubectl get pods -n observability
```

**预期输出**:
```
# demo-app
NAME                READY   STATUS    RESTARTS   AGE
api-service1-xxx    2/2     Running   0          xx
api-service2-xxx    2/2     Running   0          xx
frontend-xxx        2/2     Running   0          xx
postgres-xxx        1/1     Running   0          xx

# observability
NAME                READY   STATUS    RESTARTS   AGE
grafana-xxx         1/1     Running   0          xx
jaeger-xxx          1/1     Running   0          xx
loki-xxx            1/1     Running   0          xx
otel-collector-xxx  1/1     Running   0          xx
prometheus-xxx      1/1     Running   0          xx
```

✅ **通过条件**: 9 个 Pod 全部 Running，demo-app Pod 为 2/2（含 istio-proxy sidecar）

---

## 📊 数据流路径

```
                         ┌──────────────────────┐
                         │     Istio Envoy       │
                         │   (Zipkin Tracer)     │
                         └──────────┬───────────┘
                                    │ Zipkin :9411
                         ┌──────────▼───────────┐
                         │   OTel Collector      │
                         │                       │
                         │  Traces → Jaeger      │
                         │  Metrics → Prometheus │
                         │  Logs → Loki          │
                         └──┬────────┬────────┬──┘
                            │        │        │
                    ┌───────▼──┐ ┌──▼────┐ ┌─▼─────┐
                    │  Jaeger  │ │Prometh│ │ Loki  │
                    │  :30091  │ │ :30092│ │ :3100 │
                    └────┬─────┘ └──┬────┘ └──┬────┘
                         └──────────┼────────┘
                              ┌─────▼─────┐
                              │  Grafana   │
                              │  :30090    │
                              └───────────┘
```

---

## 🧹 清理

```bash
# 在 VM 上执行
kubectl delete namespace demo-app
kubectl delete namespace observability
kubectl delete -f ~/istio-demo/k8s/20-istio-telemetry.yaml
```

---

## 📦 项目文件结构

```
Istio/
├── README.md                    # 本验证手册
├── k8s/                         # Kubernetes 部署清单
│   ├── 00-namespaces.yaml
│   ├── 01-postgres.yaml
│   ├── 10-api-service1.yaml
│   ├── 11-api-service2.yaml
│   ├── 12-frontend.yaml
│   ├── 20-istio-telemetry.yaml
│   ├── 21-istio-gateway.yaml
│   ├── 30-otel-collector.yaml
│   ├── 31-jaeger.yaml
│   ├── 32-prometheus.yaml
│   ├── 33-loki.yaml
│   ├── 34-grafana.yaml
│   └── kustomization.yaml
└── src/                         # 应用源码
    ├── api-service1/
    ├── api-service2/
    └── frontend/
```
