# 🚀 Aspire + Azure Container Apps 实战教程

> **实战项目**：`AspireACA` — 已成功部署在 `australiaeast`  
> **你的 App URL**：https://webfrontend.salmonpond-79ce5709.australiaeast.azurecontainerapps.io  
> **前置阅读**：先看完 `AspireApp/教程-中文.md` 了解基础概念，再来读这篇

---

## 目录

1. [先搞清楚：Aspire 和 ACA 到底是什么？](#1-先搞清楚aspire-和-aca-到底是什么)
2. [从代码到云：一条命令发生了什么](#2-从代码到云一条命令发生了什么)
3. [AppHost.cs 逐行解释（ACA 版）](#3-apphostcs-逐行解释aca-版)
4. [Service Discovery：云中怎么找到对方？](#4-service-discovery云中怎么找到对方)
5. [我们踩过的坑 & 解决方案](#5-我们踩过的坑--解决方案)
6. [费用精算](#6-费用精算)
7. [常用操作手册](#7-常用操作手册)
8. [动手练习（由浅入深）](#8-动手练习由浅入深)

---

## 1. 先搞清楚：Aspire 和 ACA 到底是什么？

### 1.1 一句话总结

| 技术 | 是什么 | 类比 |
|------|--------|------|
| **Aspire** | 用 C# 代码描述你的应用需要哪些服务、怎么连接 | 建筑师的图纸 |
| **ACA** (Azure Container Apps) | Azure 上免运维的容器运行环境 | 建好的房子 |

### 1.2 Aspire ≠ 容器编排器

很多人的误解：Aspire 是 K8s 的替代品。

**真相**：Aspire 是 **开发体验层**，它的核心价值在于：

```
传统开发流程：
  写代码 → 写 Dockerfile → 写 docker-compose.yml → 写 K8s YAML → 部署
  ↑ 4 套配置，各自维护，容易不一致

Aspire 开发流程：
  写 AppHost.cs（一个文件，C#）→ aspire run（本地） / azd up（云端）
  ↑ 一套配置，本地云端一模一样
```

Aspire 做的事情：
- **声明你要什么**：`AddProject<MyApi>()` 而不是手写 YAML
- **自动注入配置**：连接字符串、服务地址自动配好
- **内置可观测性**：日志、追踪、指标自动收集
- **统一本地和云端**：本地用 Docker，云端用 ACA，同一套代码

### 1.3 Azure Container Apps (ACA) 是什么？

```
┌────────────────────────────────────────────┐
│           Azure Container Apps             │
│                                            │
│  你把容器镜像给我 → 我帮你跑                  │
│  你不用管：服务器、网络、扩容、证书、监控       │
│                                            │
│  特性：                                     │
│  • Serverless：不请求时缩到 0，不花钱          │
│  • KEDA 自动伸缩：基于 HTTP/队列/CPU 自动扩缩  │
│  • 内置 HTTPS + 自定义域名                    │
│  • 内置 Dapr 微服务框架（可选）                │
│  • 按 vCPU/内存 秒级计费                     │
└────────────────────────────────────────────┘
```

**ACA 对比 AKS（什么时候用哪个）**：

| 场景 | 用 ACA | 用 AKS |
|------|:---:|:---:|
| 微服务 / API | ✅ 推荐 | 可以但重 |
| 不想管服务器 | ✅ | ❌ 需要运维 |
| 需要 GPU | ❌ | ✅ |
| 需要 Service Mesh (Istio) | ❌ | ✅ |
| 复杂网络策略 | 有限 | ✅ 完整 |
| 成本敏感 | ✅ 缩零免费 | ❌ 节点一直跑 |
| 快速迭代 | ✅ 一键部署 | 需要 CI/CD |

---

## 2. 从代码到云：一条命令发生了什么

当你在 `AspireACA` 目录执行 `azd up` 时，背后发生的事情：

```
┌──────────────────────────────────────────────────────────────┐
│ 阶段 1：azd init（只需做一次）                                  │
│                                                              │
│  azd 读取你的 AppHost.cs                                     │
│  → 发现你用了 AddAzureContainerAppEnvironment                  │
│  → 发现你调了 PublishAsAzureContainerApp                      │
│  → 生成 azure.yaml（部署配置）                                 │
│  → 创建 .azure/aspireaca-nz/ 环境目录                          │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 阶段 2：Provision（创建 Azure 资源）                            │
│                                                              │
│  ① 创建资源组           rg-aspireaca-nz         ~1 秒         │
│  ② 创建容器注册表        acaenvacrimh7edn5ht2ew   ~7 秒        │
│     （存你的 Docker 镜像）                                     │
│  ③ 创建 Log Analytics    acaenvlaw-imh7edn5ht2ew  ~50 秒      │
│     （存所有日志和指标）                                       │
│  ④ 创建 ACA 环境         acaenvimh7edn5ht2ew      ~2 分钟     │
│     （容器 App 的运行环境，类似 K8s 的 Namespace）               │
│  ⑤ 创建 ACA Dashboard    aspire-dashboard         ~30 秒      │
│     （Aspire 的可观测性面板）                                   │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 阶段 3：Package（构建 Docker 镜像）                             │
│                                                              │
│  ① 编译：dotnet publish AspireACA.ApiService                  │
│  ② 编译：dotnet publish AspireACA.Web                         │
│  ③ 构建镜像：docker build -t apiservice:latest                 │
│  ④ 构建镜像：docker build -t webfrontend:latest                │
│  ⑤ 打标签：docker tag → acaenvacrimh7edn5ht2ew.azurecr.io/...  │
│  ⑥ 推镜像：docker push → ACR                                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ 阶段 4：Deploy（部署到 ACA）                                   │
│                                                              │
│  ① 创建 Container App: apiservice                             │
│     → 镜像：ACR/apiservice:latest                             │
│     → 规格：0.5 vCPU, 1GB RAM                                │
│     → 伸缩：Min=0, Max=1                                     │
│     → 入口：仅内部访问（internal）                              │
│                                                              │
│  ② 创建 Container App: webfrontend                            │
│     → 镜像：ACR/webfrontend:latest                            │
│     → 规格：0.5 vCPU, 1GB RAM                                │
│     → 伸缩：Min=0, Max=1                                     │
│     → 入口：外部可访问（external）                              │
│                                                              │
│  ③ 配置服务发现：                                              │
│     → webfrontend 环境变量注入 apiservice 的内部地址            │
│     → 这样 Web 调用 "apiservice" 就能找到 API                  │
└──────────────────────────────────────────────────────────────┘
```

### 实际执行时间统计（australiaeast）

| 步骤 | 耗时 |
|------|------|
| 资源组 | 1.3s |
| ACR | 7.5s |
| Log Analytics | 52s |
| ACA 环境 | 2m6s |
| 构建+推送镜像 | ~45s |
| 部署 apiservice | 45s |
| 部署 webfrontend | 58s |
| **总计** | **≈ 5 分钟** |

---

## 3. AppHost.cs 逐行解释（ACA 版）

```csharp
// ① 创建分布式应用构建器（Aspire 的入口）
var builder = DistributedApplication.CreateBuilder(args);

// ② 声明 ACA 环境（告诉 Aspire：我要部署到 Azure Container Apps）
//    这个调用会自动生成 Bicep 模板，创建 ACA Environment + ACR + Log Analytics
var acaEnvironment = builder.AddAzureContainerAppEnvironment("aca-env");

// ③ 注册 API 项目，并指定部署方式
var apiService = builder.AddProject<Projects.AspireACA_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")          // 健康检查端点（ACA 用这个判断服务是否就绪）
    .PublishAsAzureContainerApp((infra, app) =>  // ★ 关键：标记为 ACA 部署
    {
        app.Template.Scale.MinReplicas = 0;  // 无请求时缩到 0（省钱！）
        app.Template.Scale.MaxReplicas = 1;  // 最多 1 个实例（学生够用）
    });

// ④ 注册 Web 项目
builder.AddProject<Projects.AspireACA_Web>("webfrontend")
    .WithExternalHttpEndpoints()             // 对外暴露（外部可访问）
    .WithHttpHealthCheck("/health")
    .WithReference(apiService)               // ★ 注入 apiservice 的连接信息
    .WaitFor(apiService)                     // 等 API 就绪后再启动
    .PublishAsAzureContainerApp((infra, app) =>
    {
        app.Template.Scale.MinReplicas = 0;  // 省钱
        app.Template.Scale.MaxReplicas = 1;
    });

// ⑤ 启动应用
builder.Build().Run();
```

### 关键方法速查

| 方法 | 作用 | 本地开发 | 云端部署 |
|------|------|:---:|:---:|
| `AddAzureContainerAppEnvironment` | 声明 ACA 环境 | 不影响 | 生成 ACA Environment + ACR + Log Analytics |
| `PublishAsAzureContainerApp` | 标记此项目部署到 ACA | 不影响 | 生成 Container App 资源 |
| `WithHttpHealthCheck("/health")` | 健康检查 | Docker healthcheck | ACA readiness probe |
| `WithExternalHttpEndpoints` | 对外暴露 | localhost 端口 | 公网 HTTPS URL |
| `WithReference(apiService)` | 注入服务连接 | 注入 localhost 地址 | 注入 ACA 内部地址 |
| `WaitFor(apiService)` | 启动顺序 | 等容器 healthy | 等 ACA revision ready |

---

## 4. Service Discovery：云中怎么找到对方？

### 问题

Web 前端需要调用 API 服务。在 ACA 里，它们各自有独立的 URL，而且 IP/端口会变。

### 传统做法（不好）

```csharp
// ❌ 硬编码 IP/端口，换个环境就挂
client.BaseAddress = new("https://10.0.0.5:443");
```

### Aspire 做法（你项目里实际在用的）

```csharp
// ✅ 用服务名，永远不用改
client.BaseAddress = new("https+http://apiservice");
```

### 在 ACA 中是怎么解析的？

```
webfrontend (Container App)
    │
    │  HTTP GET https+http://apiservice/weatherforecast
    │
    ▼
Aspire Service Discovery 中间件
    │
    │  读取环境变量（azd 自动注入的）：
    │  services__apiservice__https__0 = https://apiservice.internal.xxx.azurecontainerapps.io
    │
    ▼
解析为实际 URL → https://apiservice.internal.salmonpond-...azurecontainerapps.io/weatherforecast
```

**你不用关心这些环境变量**——Aspire 在部署时自动注入，在运行时自动解析。你只管写 `"apiservice"` 就行。

---

## 5. 我们踩过的坑 & 解决方案

### 坑 1：`azd up` 在 "Logging in to registry" 卡死

**现象**：`azd up` 在部署阶段一直显示 `Logging in to registry`，几分钟不动。

**原因**：Docker Desktop 的 credential helper 无法正常登录 ACR（国内网络环境尤其常见）。

**解决**：
```powershell
# 1. 先手动获取 ACR token 并 docker login
az acr login -n <你的ACR名> --expose-token
# 复制 refreshToken，然后：
docker login <ACR地址> -u 00000000-0000-0000-0000-000000000000 -p <refreshToken>

# 2. 分开执行 package 和 deploy
azd package    # 构建镜像
azd deploy     # 部署到 ACA
```

### 坑 2：Dashboard 组件部署失败（名称冲突）

**现象**：`Failed to provision component 'aspire-dashboard'`

**原因**：上一次部署的资源软删除残留，新部署尝试同名创建。

**解决**：重试 `azd up`，已存在的资源会跳过，通常第二次就成功。

### 坑 3：`PublishAsAzureContainerApp()` 报参数错误

**现象**：
```
"PublishAsAzureContainerApp"方法没有采用 0 个参数的重载
```

**原因**：API 要求传一个配置回调 `(infra, app) => { ... }`。

**正确写法**：
```csharp
.PublishAsAzureContainerApp((infra, app) =>
{
    app.Template.Scale.MinReplicas = 0;
    app.Template.Scale.MaxReplicas = 1;
})
```

### 坑 4：必须加 `AddAzureContainerAppEnvironment`

**现象**：
```
Resource 'apiservice' is configured to publish as an Azure Container App,
but there are no 'AzureContainerAppEnvironmentResource' resources.
```

**原因**：每个 ACA 部署必须有一个环境资源，类似 K8s 需要 Namespace。

**解决**：在 `PublishAsAzureContainerApp` 之前加：
```csharp
builder.AddAzureContainerAppEnvironment("aca-env");
```

---

## 6. 费用精算

### 你的 AppHost 配置

```csharp
app.Template.Scale.MinReplicas = 0;  // 缩零
app.Template.Scale.MaxReplicas = 1;  // 最多 1 个
```

### ACA 计费模型

```
ACA 费用 = 活跃 vCPU 秒数 × $0.000013 + 活跃内存 GiB 秒数 × $0.0000015
         + 请求数（前 200 万免费）
```

**重点是**：`MinReplicas=0` 意味着没有 HTTP 请求时，容器完全停止，不计任何计算费。

### 场景分析

| 场景 | 月费 (USD) | 月费 (NZD) |
|------|:---:|:---:|
| 放着不动（0 请求） | ≈ $1.67 (只有 ACR) | ≈ $2.70 |
| 偶尔访问（每天 100 次） | ≈ $1.70 | ≈ $2.75 |
| 持续有人用（8h/天） | ≈ $5 | ≈ $8 |
| Azure for Students | **$0** (100 刀免费额度覆盖) | **$0** |

### ACR 费用（你没法避开的固定成本）

ACR Basic 约 $5/月。如果想更省，用完后 `azd down --force --purge` 销毁一切。

---

## 7. 常用操作手册

### 日常开发

```powershell
# 本地运行（Docker Desktop 需要开着）
cd AspireACA\AspireACA.AppHost
aspire run

# 本地运行后，浏览器自动打开 Dashboard
# 在 Dashboard 里可以看日志、追踪、指标、拓扑图
```

### 重新部署（改代码后）

```powershell
cd AspireACA

# 方式 1：一键（网络好时用）
azd up

# 方式 2：分步（网络差时用，更可靠）
azd package          # 构建镜像 + 推送到 ACR
azd deploy           # 更新 ACA 容器
```

### 查看状态

```powershell
# 列出所有资源
azd env list

# 查看部署的 URL
azd env get-values

# 在浏览器打开
azd monitor --live    # 实时日志
azd monitor --logs    # 历史日志
```

### 销毁（省钱的正确姿势）

```powershell
# ⚠️ 这会把 Azure 上所有相关资源全部删掉！
azd down --force --purge
```

### 切换区域

```powershell
# 创建新环境
azd env new aspireaca-sydney

# 部署时会让你选 region
azd up
# → 选 Australia East / Southeast 等
```

---

## 8. 动手练习（由浅入深）

### ⭐ 练习 1：修改 API 返回内容

1. 打开 `AspireACA.ApiService/Program.cs`
2. 把 `summaries` 数组改成中文：
   ```csharp
   string[] summaries = ["冰寒", "寒冷", "凉爽", "舒适", "温暖", "炎热", "酷热"];
   ```
3. 运行 `azd deploy` 重新部署
4. 刷新你的网页，看天气描述变中文

### ⭐ 练习 2：添加新的 API 端点

1. 在 `Program.cs` 里加一个新端点：
   ```csharp
   app.MapGet("/hello", () => new { Message = "Hello from ACA! 🚀", Time = DateTime.UtcNow });
   ```
2. 部署后访问 `https://apiservice.internal.xxx...azurecontainerapps.io/hello`

### ⭐⭐ 练习 3：在 Web 前端消费新端点

1. 在 `WeatherApiClient.cs` 里加一个新方法调用 `/hello`
2. 在 Web 页面展示返回的数据
3. 部署后验证

### ⭐⭐ 练习 4：调整伸缩策略

修改 `AppHost.cs`：
```csharp
app.Template.Scale.MinReplicas = 1;   // 至少保留 1 个实例
app.Template.Scale.MaxReplicas = 3;   // 最多 3 个
```
部署后用 `az monitor --live` 观察伸缩行为。

### ⭐⭐⭐ 练习 5：添加 Redis 缓存

1. 在 `AppHost.cs` 加入：
   ```csharp
   var cache = builder.AddRedis("cache")
       .PublishAsAzureContainerApp(...);  // 或用 Azure Cache for Redis
   ```
2. 在 API 里对 `/weatherforecast` 结果缓存 30 秒
3. 部署验证缓存命中率

### ⭐⭐⭐ 练习 6：添加 PostgreSQL + CRUD

参考 `AspireApp` 项目（你已有的 Docker Compose 版本），把它移植到 ACA。

---

## 附录：项目文件清单 & 作用

```
AspireACA/
├── azure.yaml                         ← azd 部署配置（告诉 azd 这是 Aspire 项目）
├── aspire.config.json                 ← Aspire CLI 配置
├── AspireACA.slnx                     ← 解决方案
│
├── AspireACA.AppHost/                 ← ★ 编排器（核心）
│   ├── AppHost.cs                     ←    声明所有服务 + ACA 部署配置
│   └── AspireACA.AppHost.csproj       ←    引用 Aspire.Hosting.Azure.AppContainers
│
├── AspireACA.ApiService/              ← 后端 API
│   ├── Program.cs                     ←    Minimal API 端点
│   └── AspireACA.ApiService.csproj
│
├── AspireACA.Web/                     ← 前端
│   ├── Program.cs                     ←    Blazor + Service Discovery 配置
│   ├── WeatherApiClient.cs           ←    调用 API 的 HTTP 客户端
│   └── Components/                    ←    Razor 组件
│
├── AspireACA.ServiceDefaults/         ← 共享基础设施
│   └── Extensions.cs                  ←    健康检查 + OTel + 服务发现 + 弹性
│
└── AspireACA.Tests/                   ← 测试
    └── WebTests.cs
```

---

> 💡 **建议**：先把练习 1 和 2 做了，感受一下"改代码 → `azd deploy` → 刷新网页"的极简迭代体验。这比写 K8s YAML 快 100 倍。
