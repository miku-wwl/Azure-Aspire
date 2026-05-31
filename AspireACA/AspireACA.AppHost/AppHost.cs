var builder = DistributedApplication.CreateBuilder(args);

// ★ ACA 环境
var acaEnvironment = builder.AddAzureContainerAppEnvironment("aca-env");
// 本地 aspire run 用容器，azd up 用 Azure 托管资源
var cache = builder.AddAzureManagedRedis("cache");
if (builder.ExecutionContext.IsRunMode)
{
    cache = cache.RunAsContainer();
}
// 旧版容器托管 Redis：保留作参考
// var cache = builder.AddRedis("cache");

// Azure Database for PostgreSQL
var postgres = builder.AddAzurePostgresFlexibleServer("postgres");
if (builder.ExecutionContext.IsRunMode)
{
    postgres = postgres.RunAsContainer();
}
var todosDb = postgres.AddDatabase("todosdb");
// 旧版容器托管 PostgreSQL：保留作参考
// var postgres = builder.AddPostgres("postgres")
//     .WithPgAdmin();
// var todosDb = postgres.AddDatabase("todosdb");

// ─── API Service ───
var apiService = builder.AddProject<Projects.AspireACA_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithReference(todosDb)
    .WaitFor(todosDb)
    .PublishAsAzureContainerApp((infra, app) =>
    {
        // ★ 省钱配置：最小规格，缩放到 0
        app.Template.Scale.MinReplicas = 0;
        app.Template.Scale.MaxReplicas = 1;
    });

// ─── Web Frontend ───
builder.AddProject<Projects.AspireACA_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(apiService)
    .WaitFor(apiService)
    .PublishAsAzureContainerApp((infra, app) =>
    {
        // ★ 省钱配置：最小规格，缩放到 0
        app.Template.Scale.MinReplicas = 0;
        app.Template.Scale.MaxReplicas = 1;
    });

builder.Build().Run();
