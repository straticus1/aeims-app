-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CloudProvider" AS ENUM ('AWS', 'OCI', 'GCP', 'AZURE', 'DOCKER', 'KUBERNETES', 'CLOUDFLARE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('COMPUTE_INSTANCE', 'CONTAINER', 'CONTAINER_SERVICE', 'DNS_ZONE', 'DNS_RECORD', 'LOAD_BALANCER', 'DATABASE', 'STORAGE_BUCKET', 'VPC', 'SUBNET', 'SECURITY_GROUP');

-- CreateEnum
CREATE TYPE "SecretType" AS ENUM ('API_KEY', 'DATABASE', 'JWT', 'OAUTH', 'SSH_KEY', 'CERTIFICATE', 'GENERIC');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Architecture" AS ENUM ('ARM64', 'AMD64');

-- CreateEnum
CREATE TYPE "BuildHostStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BuildJobStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JenkinsAgentStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "displayName" TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "data" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cloud_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT,
    "credentials" JSONB NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastValidated" TIMESTAMP(3),
    "lastScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_cloud_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT,
    "arch" TEXT,
    "os" TEXT,
    "version" TEXT,
    "publicIp" TEXT,
    "privateIp" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE',
    "capabilities" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastValidated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "credentialId" TEXT,
    "agentId" TEXT,
    "provider" "CloudProvider" NOT NULL,
    "type" "ResourceType" NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "zone" TEXT,
    "status" TEXT,
    "state" JSONB,
    "metadata" JSONB,
    "tags" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_metrics" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secrets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SecretType" NOT NULL DEFAULT 'GENERIC',
    "description" TEXT,
    "valueEncrypted" BYTEA NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "rotationDays" INTEGER,
    "lastRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "initiatedById" TEXT,
    "name" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "previousVersion" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "CloudProvider" NOT NULL,
    "targetResources" TEXT[],
    "config" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_logs" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "service" TEXT NOT NULL,
    "resourceId" TEXT,
    "amount" DECIMAL(12,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_hosts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9847,
    "architecture" "Architecture" NOT NULL,
    "status" "BuildHostStatus" NOT NULL DEFAULT 'OFFLINE',
    "maxJobs" INTEGER NOT NULL DEFAULT 2,
    "labels" TEXT[],
    "apiKeyHash" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "build_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gitRepo" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "preBuild" TEXT,
    "postBuild" TEXT,
    "artifacts" TEXT[],
    "environment" JSONB,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookSecret" TEXT,
    "lastBuildAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "build_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_targets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "architecture" "Architecture" NOT NULL,
    "hostName" TEXT NOT NULL,
    "buildCmd" TEXT NOT NULL,
    "environment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "build_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_jobs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "hostId" TEXT,
    "initiatedById" TEXT,
    "target" "Architecture" NOT NULL,
    "status" "BuildJobStatus" NOT NULL DEFAULT 'PENDING',
    "buildCmd" TEXT,
    "preBuild" TEXT,
    "postBuild" TEXT,
    "gitBranch" TEXT,
    "gitTag" TEXT,
    "gitCommit" TEXT,
    "environment" JSONB,
    "artifacts" TEXT[],
    "exitCode" INTEGER,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "build_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "build_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenkins_agents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jenkinsUrl" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "architecture" "Architecture" NOT NULL,
    "executors" INTEGER NOT NULL DEFAULT 1,
    "labels" TEXT[],
    "status" "JenkinsAgentStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSeenAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jenkins_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_HostProjects" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HostProjects_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "organization_users_organizationId_userId_key" ON "organization_users"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_tokenHash_key" ON "api_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "user_cloud_credentials_userId_idx" ON "user_cloud_credentials"("userId");

-- CreateIndex
CREATE INDEX "user_cloud_credentials_organizationId_idx" ON "user_cloud_credentials"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_cloud_credentials_userId_organizationId_provider_name_key" ON "user_cloud_credentials"("userId", "organizationId", "provider", "name");

-- CreateIndex
CREATE UNIQUE INDEX "agents_organizationId_name_key" ON "agents"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "provider_credentials_organizationId_provider_name_key" ON "provider_credentials"("organizationId", "provider", "name");

-- CreateIndex
CREATE INDEX "resources_organizationId_type_idx" ON "resources"("organizationId", "type");

-- CreateIndex
CREATE INDEX "resources_organizationId_provider_idx" ON "resources"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "resources_organizationId_provider_providerId_key" ON "resources"("organizationId", "provider", "providerId");

-- CreateIndex
CREATE INDEX "resource_metrics_resourceId_name_timestamp_idx" ON "resource_metrics"("resourceId", "name", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "secrets_organizationId_name_key" ON "secrets"("organizationId", "name");

-- CreateIndex
CREATE INDEX "deployments_organizationId_status_idx" ON "deployments"("organizationId", "status");

-- CreateIndex
CREATE INDEX "deployments_organizationId_service_idx" ON "deployments"("organizationId", "service");

-- CreateIndex
CREATE INDEX "deployment_logs_deploymentId_timestamp_idx" ON "deployment_logs"("deploymentId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_timestamp_idx" ON "audit_logs"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_action_idx" ON "audit_logs"("organizationId", "action");

-- CreateIndex
CREATE INDEX "cost_records_organizationId_provider_periodStart_idx" ON "cost_records"("organizationId", "provider", "periodStart");

-- CreateIndex
CREATE INDEX "cost_records_organizationId_periodStart_idx" ON "cost_records"("organizationId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "build_hosts_organizationId_name_key" ON "build_hosts"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "build_projects_organizationId_name_key" ON "build_projects"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "build_targets_projectId_architecture_key" ON "build_targets"("projectId", "architecture");

-- CreateIndex
CREATE INDEX "build_jobs_organizationId_status_idx" ON "build_jobs"("organizationId", "status");

-- CreateIndex
CREATE INDEX "build_jobs_projectId_status_idx" ON "build_jobs"("projectId", "status");

-- CreateIndex
CREATE INDEX "build_logs_jobId_timestamp_idx" ON "build_logs"("jobId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "jenkins_agents_organizationId_name_key" ON "jenkins_agents"("organizationId", "name");

-- CreateIndex
CREATE INDEX "_HostProjects_B_index" ON "_HostProjects"("B");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cloud_credentials" ADD CONSTRAINT "user_cloud_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cloud_credentials" ADD CONSTRAINT "user_cloud_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "provider_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_metrics" ADD CONSTRAINT "resource_metrics_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_logs" ADD CONSTRAINT "deployment_logs_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_hosts" ADD CONSTRAINT "build_hosts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_projects" ADD CONSTRAINT "build_projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_targets" ADD CONSTRAINT "build_targets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "build_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_jobs" ADD CONSTRAINT "build_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "build_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_jobs" ADD CONSTRAINT "build_jobs_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "build_hosts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_jobs" ADD CONSTRAINT "build_jobs_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_logs" ADD CONSTRAINT "build_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "build_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jenkins_agents" ADD CONSTRAINT "jenkins_agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HostProjects" ADD CONSTRAINT "_HostProjects_A_fkey" FOREIGN KEY ("A") REFERENCES "build_hosts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HostProjects" ADD CONSTRAINT "_HostProjects_B_fkey" FOREIGN KEY ("B") REFERENCES "build_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
