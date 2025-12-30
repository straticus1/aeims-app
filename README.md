# AEIMS - Advanced Engineering Infrastructure Management Services

Cloud-agnostic infrastructure management platform by After Dark Systems.

## Overview

AEIMS provides a unified web interface and API for managing infrastructure across multiple cloud providers and on-premise environments. Deploy the AEIMS Agent on client networks to manage local resources through the central dashboard.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AEIMS Web GUI (aeims.app)                           │
│                    Next.js Dashboard / API / CLI                            │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                     gRPC/REST API Calls
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ AEIMS Agent     │   │ AEIMS Agent     │   │ AEIMS Agent     │
│ (Client Network)│   │ (OCI Instance)  │   │ (AWS Account)   │
│                 │   │                 │   │                 │
│ - Docker mgmt   │   │ - Compute       │   │ - ECS/ECR       │
│ - Local builds  │   │ - DNS zones     │   │ - Route53       │
│ - Secrets vault │   │ - Networking    │   │ - CloudWatch    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## Features

- **Multi-Cloud Compute** - Manage EC2, OCI Compute, GCP VMs, and Azure VMs from one interface
- **Container Orchestration** - Docker, ECS, OKE, GKE support
- **DNS Management** - Route53, OCI DNS, Cloudflare unified management
- **Secrets Vault** - Secure credential storage with rotation policies
- **Cost Tracking** - Cross-cloud billing aggregation and forecasting
- **Deployments** - One-click deployments with rollback support
- **Build Integration** - Native integration with ADS Build Services for multi-arch builds
- **AEIMS Agents** - Deploy agents on client networks for local resource management

## Quick Start

### Web Dashboard

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and provider credentials

# Initialize database
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### AEIMS Agent

The agent runs on client infrastructure to manage local resources:

```bash
# Build the agent
cd agent
go build -o aeims-agent ./cmd/aeims-agent

# Run with config
./aeims-agent --config /etc/aeims/agent.yaml

# Or use environment variables
AEIMS_PROVIDERS_DOCKER_ENABLED=true ./aeims-agent
```

#### Agent Configuration

```yaml
# /etc/aeims/agent.yaml
agent_id: "my-datacenter-01"
name: "Primary Datacenter Agent"

grpc_port: 9850
http_port: 9852
metrics_port: 9851

control_plane:
  enabled: true
  url: "https://aeims.app"
  token: "${AEIMS_AGENT_TOKEN}"

providers:
  docker:
    enabled: true
    host: "unix:///var/run/docker.sock"

  aws:
    enabled: true
    region: "us-east-1"
    # Uses ~/.aws/credentials or IAM role

  oci:
    enabled: true
    config_file: "~/.oci/config"
    region: "us-ashburn-1"

builds:
  enabled: true
  daemon_host: "localhost"
  daemon_port: 9847
```

### Systemd Service

```bash
# Install as service
sudo cp agent/systemd/aeims-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable aeims-agent
sudo systemctl start aeims-agent
```

## Project Structure

```
ads-aeims-enterprise/
├── src/                      # Next.js web application
│   ├── app/                  # App router pages
│   │   ├── (dashboard)/      # Dashboard routes
│   │   │   ├── compute/      # Compute instances
│   │   │   ├── containers/   # Container management
│   │   │   ├── dns/          # DNS zones & records
│   │   │   ├── secrets/      # Secrets vault
│   │   │   ├── costs/        # Cost tracking
│   │   │   └── deployments/  # Deployment management
│   │   └── api/              # API routes
│   ├── components/           # React components
│   │   ├── ui/               # Base UI components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   └── modules/          # Feature modules
│   ├── lib/                  # Library code
│   │   ├── providers/        # Cloud provider adapters
│   │   └── utils/            # Utility functions
│   └── types/                # TypeScript definitions
│
├── agent/                    # Go-based AEIMS Agent
│   ├── cmd/aeims-agent/      # Agent entrypoint
│   ├── pkg/                  # Agent packages
│   │   ├── api/              # gRPC service implementation
│   │   ├── docker/           # Docker provider
│   │   ├── compute/          # Cloud compute providers
│   │   ├── dns/              # DNS providers
│   │   ├── secrets/          # Local secrets vault
│   │   └── config/           # Configuration
│   └── proto/                # Protocol buffer definitions
│
├── prisma/                   # Database schema
└── infrastructure/           # Deployment configs
```

## Supported Providers

| Provider | Compute | Containers | DNS | Secrets | Costs |
|----------|---------|------------|-----|---------|-------|
| AWS | EC2 | ECS, Fargate | Route53 | Secrets Manager | Cost Explorer |
| OCI | Compute | OKE | DNS | Vault | Cost Analysis |
| Docker | - | Docker API | - | - | - |
| Kubernetes | - | K8s API | - | K8s Secrets | - |
| Cloudflare | - | - | DNS | - | - |

## Build Integration

AEIMS integrates with [ADS Build Services](../ads_buildservices) for native multi-architecture builds:

```yaml
# In agent config
builds:
  enabled: true
  daemon_host: "arm-builder.internal"
  daemon_port: 9847
  work_dir: "/var/lib/aeims/builds"
```

Trigger builds from the dashboard or API:

```bash
curl -X POST https://aeims.app/api/builds \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project": "billing-service",
    "target": "arm64",
    "agent": "arm-builder-01"
  }'
```

## API

### Authentication

```bash
# Get API token from dashboard or use ADS SSO
curl -X POST https://aeims.app/api/auth/token \
  -d '{"email": "user@example.com", "password": "..."}'
```

### Resources

```bash
# List all compute instances
GET /api/resources?type=compute

# List containers on specific agent
GET /api/agents/{agentId}/containers

# Create DNS record
POST /api/dns/zones/{zoneId}/records
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

### Agent Development

```bash
cd agent

# Run locally
go run ./cmd/aeims-agent --enable-docker

# Build for all platforms
make release

# Run tests
go test ./...
```

## License

Proprietary - After Dark Systems

## Related Projects

- [ADS Build Services](../ads_buildservices) - Multi-architecture native build system
- [After Dark MCP Builder](../afterdark-mcp-builder) - MCP server integrations
