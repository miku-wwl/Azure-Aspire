var builder = DistributedApplication.CreateBuilder(args);

// Redis cache for output caching
var cache = builder.AddRedis("cache");

// PostgreSQL database for persistent storage
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin();
var todosDb = postgres.AddDatabase("todosdb");

var apiService = builder.AddProject<Projects.AspireApp_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithReference(todosDb)
    .WaitFor(postgres);

builder.AddProject<Projects.AspireApp_Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();
