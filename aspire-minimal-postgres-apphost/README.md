# Aspire Minimal AppHost — Postgres Only

这是一个最小化的 Aspire `AppHost` 项目，只声明并管理一个 PostgreSQL 资源。它展示如何用 Aspire 的声明式 API 在本地启动并管理 Postgres，而不用写或理解 `docker-compose.yaml`。

运行说明：

1. 使用 Aspire CLI（推荐）

```powershell
cd aspire-minimal-postgres-apphost
# 使用 aspire CLI 启动（会自动检查 Docker 并运行容器）
aspire run
```

2. 或直接用 dotnet 运行（依赖已安装的 SDK）：

```powershell
cd aspire-minimal-postgres-apphost
dotnet run
```

说明：
- `aspire run` 会以更高层的方式管理构建、容器和 Dashboard；它会在后台调用 Docker。你不需要自己写 `docker-compose`。
- 运行后，Aspire 会启动 Postgres（以及可选的 PgAdmin），并在 Dashboard 中展示资源状态。
- 如果需要把运行产物导出成 `docker-compose.yaml`，可以执行 `aspire publish --output-path ../publish-output`（与现有项目流程类似）。

想让我为你做什么：
- 我可以把这个项目添加到解决方案并演示 `aspire run`（会在本机启动 Postgres）；
- 或只需生成更多示例（如去掉 PgAdmin、指定数据库名称、或添加健康检查）。
