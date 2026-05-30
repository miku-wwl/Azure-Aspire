var builder = DistributedApplication.CreateBuilder(args);

// ★ ACA 环境
var acaEnvironment = builder.AddAzureContainerAppEnvironment("aca-env");
// Redis cache for output caching
var cache = builder.AddRedis("cache");

// PostgreSQL database for persistent storage
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin();
var todosDb = postgres.AddDatabase("todosdb");

// ─── API Service ───
var apiService = builder.AddProject<Projects.AspireACA_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithReference(todosDb)
    .WaitFor(postgres)
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
