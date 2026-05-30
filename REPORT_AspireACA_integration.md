# AspireACA 集成报告 — Postgres + Redis 与部署流程

## 概要
- 已在 `AspireACA.AppHost/AppHost.cs` 中添加 Redis 资源（`cache`）与 PostgreSQL 资源（`postgres`，含 `todosdb`）。
- 已在 `AspireACA.AppHost/AspireACA.AppHost.csproj` 中补充依赖包：`Aspire.Hosting.PostgreSQL`、`Aspire.Hosting.Redis`。
- 已在 `AspireACA` 目录执行本地 `aspire run` 调试（先遇到缺包报错，补包后可启动）。
- 已生成 Azure 发布产物（Bicep），路径为 `AspireACA/publish-output`。

## 变更文件
- `AspireACA.AppHost/AppHost.cs`
  - 新增：`builder.AddRedis("cache")`
  - 新增：`builder.AddPostgres("postgres").WithPgAdmin()`
  - 新增：`var todosDb = postgres.AddDatabase("todosdb")`
  - 新增依赖编排：
    - `apiservice` 增加 `.WithReference(todosDb).WaitFor(postgres)`
    - `webfrontend` 增加 `.WithReference(cache).WaitFor(cache)`

- `AspireACA.AppHost/AspireACA.AppHost.csproj`
  - 新增 NuGet 包：
    - `Aspire.Hosting.PostgreSQL`（13.3.5）
    - `Aspire.Hosting.Redis`（13.3.5）

- `.gitignore`
  - 已新增 `publish-output` 忽略规则，避免发布生成内容误提交。

## 本地调试流程（已执行）
1. 在 `AspireACA` 下运行：

```bash
aspire run
```

2. 结果说明：
- 首次运行因缺少 `AddRedis`/`AddPostgres` 对应包而编译失败。
- 添加包引用后重新运行，AppHost 可启动，并输出本地 Dashboard 地址。

## 发布产物（用于 Azure Container Apps）
- 目录：`AspireACA/publish-output`
- 关键文件：
  - `main.bicep`：订阅级入口模板（负责资源组与模块编排）
  - `aca-env/*`
  - `aca-env-acr/*`
  - `cache/cache.bicep`
  - `postgres/postgres.bicep`
  - `apiservice/apiservice.bicep`
  - `webfrontend/webfrontend.bicep`

## 部署到 Azure 的手工步骤
1. 先登录并确认订阅：

```bash
az login
az account show
```

2. 执行订阅级部署（示例）：

```bash
az deployment sub create --location southeastasia \
  --template-file AspireACA/publish-output/main.bicep \
  --parameters resourceGroupName=rg-aspireaca-demo location=southeastasia principalId=<YOUR_PRINCIPAL_OBJECT_ID>
```

3. 部署完成后：
- 可从输出获取 `aca_env_AZURE_CONTAINER_APPS_ENVIRONMENT_ID`、ACR Endpoint 等信息。
- 后续可推送镜像到 ACR，并完成 Container App 端镜像引用与发布。

## 注意事项
- 本部署会创建 ACA 环境、ACR、Azure Cache for Redis、Azure Database for PostgreSQL，可能产生成本。
- 受订阅配额与策略限制（如 ACA 环境数量、可用区域白名单），部署前需确认。
- 该 `main.bicep` 为订阅级模板；若改为资源组级流程，可改用 `az deployment group create`。

## 当前状态
- 已完成：代码集成、本地调试验证、发布产物生成、报告输出。
- 未执行：实际 Azure 线上部署（为避免未经确认创建计费资源）。

## 我可继续代办
- 直接执行 Azure 部署并回传资源校验结果。
- 自动化后续步骤：镜像推送至 ACR、Container App 更新与验证。
- 清理本地发布目录（如你需要）。
