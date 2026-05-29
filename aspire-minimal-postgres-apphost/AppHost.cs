var builder = DistributedApplication.CreateBuilder(args);

// Minimal Aspire AppHost — only PostgreSQL
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin();

builder.Build().Run();
