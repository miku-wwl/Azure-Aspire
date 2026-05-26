var builder = DistributedApplication.CreateBuilder(args);

// ★ ACA 环境
var acaEnvironment = builder.AddAzureContainerAppEnvironment("aca-env");

// ─── API Service ───
var apiService = builder.AddProject<Projects.AspireACA_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
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
    .WithReference(apiService)
    .WaitFor(apiService)
    .PublishAsAzureContainerApp((infra, app) =>
    {
        // ★ 省钱配置：最小规格，缩放到 0
        app.Template.Scale.MinReplicas = 0;
        app.Template.Scale.MaxReplicas = 1;
    });

builder.Build().Run();
