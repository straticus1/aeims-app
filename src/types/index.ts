// AEIMS - Advanced Engineering Infrastructure Management Services
// Core type definitions for cloud-agnostic infrastructure management

// ============================================================================
// Provider Types
// ============================================================================

export type CloudProvider =
  | 'aws'
  | 'oci'
  | 'gcp'
  | 'azure'
  | 'docker'
  | 'kubernetes'
  | 'cloudflare'
  | 'neon'
  | 'vast'
  | 'runpod'
  | 'vercel'
  | 'fly';

export interface ProviderCredentials {
  id: string;
  provider: CloudProvider;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Provider-specific credentials stored encrypted
  credentials: Record<string, string>;
}

export interface ProviderConfig {
  provider: CloudProvider;
  region?: string;
  credentials: ProviderCredentials;
}

// ============================================================================
// Compute Resources
// ============================================================================

export type InstanceState = 'running' | 'stopped' | 'pending' | 'terminated' | 'unknown';

export interface ComputeInstance {
  id: string;
  provider: CloudProvider;
  providerId: string; // e.g., AWS instance ID, OCI OCID
  name: string;
  state: InstanceState;
  instanceType: string; // e.g., t3.micro, VM.Standard.A1.Flex
  region: string;
  zone?: string;
  publicIp?: string;
  privateIp?: string;
  cpu: number;
  memoryGb: number;
  tags: Record<string, string>;
  createdAt: Date;
  launchedAt?: Date;
}

// ============================================================================
// Container Resources
// ============================================================================

export type ContainerState = 'running' | 'stopped' | 'restarting' | 'paused' | 'exited' | 'dead';

export interface Container {
  id: string;
  provider: CloudProvider;
  providerId: string;
  name: string;
  image: string;
  state: ContainerState;
  status: string;
  ports: PortMapping[];
  environment?: Record<string, string>;
  labels: Record<string, string>;
  createdAt: Date;
  startedAt?: Date;
  hostId?: string; // Reference to ComputeInstance if applicable
}

export interface PortMapping {
  containerPort: number;
  hostPort?: number;
  protocol: 'tcp' | 'udp';
}

export interface ContainerService {
  id: string;
  provider: CloudProvider;
  providerId: string;
  name: string;
  cluster?: string;
  desiredCount: number;
  runningCount: number;
  pendingCount: number;
  taskDefinition?: string;
  containers: Container[];
  loadBalancerArn?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DNS Resources
// ============================================================================

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SRV' | 'CAA';

export interface DnsZone {
  id: string;
  provider: CloudProvider;
  providerId: string;
  name: string; // e.g., afterdarksys.com
  recordCount: number;
  isPrivate: boolean;
  nameServers: string[];
  createdAt: Date;
}

export interface DnsRecord {
  id: string;
  zoneId: string;
  provider: CloudProvider;
  providerId?: string;
  name: string; // e.g., api.afterdarksys.com
  type: DnsRecordType;
  ttl: number;
  values: string[];
  isAlias?: boolean;
  aliasTarget?: {
    hostedZoneId: string;
    dnsName: string;
    evaluateTargetHealth: boolean;
  };
}

// ============================================================================
// Secrets & Credentials
// ============================================================================

export type SecretType = 'api_key' | 'database' | 'jwt' | 'oauth' | 'ssh' | 'certificate' | 'generic';

export interface Secret {
  id: string;
  name: string;
  type: SecretType;
  description?: string;
  provider?: CloudProvider; // null if stored locally
  providerId?: string;
  tags: string[];
  version: number;
  rotationEnabled: boolean;
  lastRotatedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Value is never exposed in API responses
}

// ============================================================================
// Cost & Billing
// ============================================================================

export interface CostSummary {
  provider: CloudProvider;
  period: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  currency: string;
  breakdown: CostBreakdownItem[];
  forecast?: {
    endOfMonth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface CostBreakdownItem {
  service: string;
  cost: number;
  percentage: number;
  resources: number;
}

// ============================================================================
// Deployments
// ============================================================================

export type DeploymentStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';

export interface Deployment {
  id: string;
  name: string;
  service: string;
  environment: string;
  status: DeploymentStatus;
  version: string;
  previousVersion?: string;
  provider: CloudProvider;
  targetResources: string[];
  startedAt: Date;
  completedAt?: Date;
  initiatedBy: string;
  logs: DeploymentLog[];
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
}

// ============================================================================
// Monitoring & Health
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceHealth {
  serviceId: string;
  serviceName: string;
  provider: CloudProvider;
  status: HealthStatus;
  lastCheck: Date;
  responseTime?: number;
  uptime: number; // percentage
  incidents: Incident[];
}

export interface Incident {
  id: string;
  serviceId: string;
  title: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  startedAt: Date;
  resolvedAt?: Date;
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  timestamp: Date;
  message: string;
  status: Incident['status'];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Dashboard & UI Types
// ============================================================================

export interface DashboardStats {
  compute: {
    total: number;
    running: number;
    stopped: number;
    byProvider: Record<CloudProvider, number>;
  };
  containers: {
    total: number;
    running: number;
    byProvider: Record<CloudProvider, number>;
  };
  dns: {
    zones: number;
    records: number;
    byProvider: Record<CloudProvider, number>;
  };
  costs: {
    mtd: number; // Month to date
    projected: number;
    byProvider: Record<CloudProvider, number>;
  };
  health: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavigationItem[];
}
