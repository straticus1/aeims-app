// AEIMS Provider Types - Extended for AI/GPU/Edge/Serverless

export type CloudProvider =
  // Traditional Cloud
  | 'aws'
  | 'oci'
  | 'gcp'
  | 'azure'
  // Container/Local
  | 'docker'
  | 'kubernetes'
  // DNS/CDN
  | 'cloudflare'
  | 'route53'
  // Serverless Database
  | 'neon'        // Serverless Postgres
  | 'planetscale' // Serverless MySQL
  | 'supabase'    // Postgres + Auth + Storage
  // AI/GPU Cloud
  | 'vast'        // Vast.ai GPU marketplace
  | 'runpod'      // RunPod GPU instances
  | 'lambda'      // Lambda Labs GPU cloud
  | 'together'    // Together.ai inference
  | 'replicate'   // Replicate ML models
  | 'modal'       // Modal serverless GPU
  // Edge/CDN
  | 'vercel'      // Vercel Edge
  | 'netlify'     // Netlify
  | 'fly'         // Fly.io edge VMs
  | 'railway'     // Railway deployments
  // Storage
  | 'r2'          // Cloudflare R2
  | 's3'          // AWS S3
  | 'backblaze';  // Backblaze B2

export type ProviderCategory =
  | 'compute'     // VMs, instances
  | 'container'   // Docker, K8s, ECS
  | 'gpu'         // AI/ML workloads
  | 'database'    // Postgres, MySQL
  | 'dns'         // DNS management
  | 'cdn'         // CDN/Edge
  | 'storage'     // Object storage
  | 'serverless'; // Functions/Edge

export interface ProviderCapabilities {
  provider: CloudProvider;
  categories: ProviderCategory[];
  features: {
    compute?: boolean;
    containers?: boolean;
    gpu?: boolean;
    dns?: boolean;
    storage?: boolean;
    database?: boolean;
    serverless?: boolean;
    byok?: boolean;  // Bring Your Own Key
  };
  regions?: string[];
  pricing?: {
    model: 'pay-as-you-go' | 'reserved' | 'spot' | 'credits';
    currency: string;
  };
}

// Provider capability registry
export const PROVIDER_CAPABILITIES: Record<CloudProvider, ProviderCapabilities> = {
  // Traditional Cloud
  aws: {
    provider: 'aws',
    categories: ['compute', 'container', 'dns', 'storage', 'database', 'serverless'],
    features: { compute: true, containers: true, dns: true, storage: true, database: true, serverless: true, byok: true },
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-northeast-1'],
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  oci: {
    provider: 'oci',
    categories: ['compute', 'container', 'dns', 'storage', 'database'],
    features: { compute: true, containers: true, dns: true, storage: true, database: true, byok: true },
    regions: ['us-ashburn-1', 'us-phoenix-1', 'eu-frankfurt-1'],
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  gcp: {
    provider: 'gcp',
    categories: ['compute', 'container', 'gpu', 'dns', 'storage', 'database', 'serverless'],
    features: { compute: true, containers: true, gpu: true, dns: true, storage: true, database: true, serverless: true, byok: true },
    regions: ['us-central1', 'us-east1', 'europe-west1'],
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  azure: {
    provider: 'azure',
    categories: ['compute', 'container', 'gpu', 'dns', 'storage', 'database', 'serverless'],
    features: { compute: true, containers: true, gpu: true, dns: true, storage: true, database: true, serverless: true, byok: true },
    regions: ['eastus', 'westus2', 'westeurope'],
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },

  // Container/Local
  docker: {
    provider: 'docker',
    categories: ['container'],
    features: { containers: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  kubernetes: {
    provider: 'kubernetes',
    categories: ['container'],
    features: { containers: true, byok: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },

  // DNS/CDN
  cloudflare: {
    provider: 'cloudflare',
    categories: ['dns', 'cdn', 'storage', 'serverless'],
    features: { dns: true, storage: true, serverless: true, byok: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  route53: {
    provider: 'route53',
    categories: ['dns'],
    features: { dns: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },

  // Serverless Database
  neon: {
    provider: 'neon',
    categories: ['database'],
    features: { database: true, serverless: true, byok: true },
    regions: ['aws-us-east-1', 'aws-us-west-2', 'aws-eu-central-1'],
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  planetscale: {
    provider: 'planetscale',
    categories: ['database'],
    features: { database: true, serverless: true },
    regions: ['us-east', 'us-west', 'eu-west', 'ap-south'],
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  supabase: {
    provider: 'supabase',
    categories: ['database', 'storage', 'serverless'],
    features: { database: true, storage: true, serverless: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },

  // AI/GPU Cloud
  vast: {
    provider: 'vast',
    categories: ['compute', 'gpu'],
    features: { compute: true, gpu: true, byok: true },
    pricing: { model: 'spot', currency: 'USD' },
  },
  runpod: {
    provider: 'runpod',
    categories: ['compute', 'gpu', 'serverless'],
    features: { compute: true, gpu: true, serverless: true, byok: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  lambda: {
    provider: 'lambda',
    categories: ['compute', 'gpu'],
    features: { compute: true, gpu: true },
    pricing: { model: 'reserved', currency: 'USD' },
  },
  together: {
    provider: 'together',
    categories: ['gpu', 'serverless'],
    features: { gpu: true, serverless: true, byok: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  replicate: {
    provider: 'replicate',
    categories: ['gpu', 'serverless'],
    features: { gpu: true, serverless: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  modal: {
    provider: 'modal',
    categories: ['gpu', 'serverless'],
    features: { gpu: true, serverless: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },

  // Edge/CDN
  vercel: {
    provider: 'vercel',
    categories: ['serverless', 'cdn'],
    features: { serverless: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  netlify: {
    provider: 'netlify',
    categories: ['serverless', 'cdn'],
    features: { serverless: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  fly: {
    provider: 'fly',
    categories: ['compute', 'container'],
    features: { compute: true, containers: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  railway: {
    provider: 'railway',
    categories: ['container', 'database'],
    features: { containers: true, database: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },

  // Storage
  r2: {
    provider: 'r2',
    categories: ['storage'],
    features: { storage: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  s3: {
    provider: 's3',
    categories: ['storage'],
    features: { storage: true, byok: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
  backblaze: {
    provider: 'backblaze',
    categories: ['storage'],
    features: { storage: true },
    pricing: { model: 'pay-as-you-go', currency: 'USD' },
  },
};

// BYOK - Bring Your Own Key interfaces
export interface BYOKCredentials {
  provider: CloudProvider;
  type: 'api_key' | 'oauth' | 'service_account' | 'iam_role' | 'ssh_key';
  credentials: Record<string, string>;
  metadata?: {
    name?: string;
    description?: string;
    expiresAt?: Date;
    scopes?: string[];
  };
}

// GPU Instance types
export interface GPUInstance {
  id: string;
  provider: CloudProvider;
  providerId: string;
  name: string;
  state: 'running' | 'stopped' | 'pending' | 'terminated';
  gpuType: string;      // e.g., 'RTX 4090', 'A100', 'H100'
  gpuCount: number;
  gpuMemoryGb: number;
  cpuCount: number;
  memoryGb: number;
  storageGb: number;
  region: string;
  pricePerHour: number;
  uptimeHours?: number;
  createdAt: Date;
}

// AI Workload types
export interface AIWorkload {
  id: string;
  provider: CloudProvider;
  type: 'training' | 'inference' | 'fine-tuning' | 'embedding';
  model?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  gpuInstance?: GPUInstance;
  metrics?: {
    tokensProcessed?: number;
    latencyMs?: number;
    costUsd?: number;
  };
  createdAt: Date;
  completedAt?: Date;
}
