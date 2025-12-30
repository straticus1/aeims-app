// AEIMS - Provider Registry
// Unified access to all cloud providers

import type { CloudProvider, ProviderCredentials } from '@/types';
import type {
  IComputeProvider,
  IContainerProvider,
  IDnsProvider,
} from './base';
import { AWSComputeProvider, AWSContainerProvider, AWSDnsProvider } from './aws';
import { DNSScienceProvider, type DNSScienceCredentials } from './dnsscience';
import { ADSBuildProvider, type IBuildProvider } from './adsbuild';

export * from './base';
export * from './aws';
export * from './dnsscience';
export * from './adsbuild';

// =============================================================================
// Provider Factory
// =============================================================================

export interface ProviderOptions {
  credentials: ProviderCredentials;
  region?: string;
}

export class ProviderRegistry {
  private computeProviders: Map<string, IComputeProvider> = new Map();
  private containerProviders: Map<string, IContainerProvider> = new Map();
  private dnsProviders: Map<string, IDnsProvider> = new Map();
  private dnsScienceProviders: Map<string, DNSScienceProvider> = new Map();
  private buildProviders: Map<string, IBuildProvider> = new Map();

  // Register a provider credential set
  registerProvider(options: ProviderOptions): void {
    const key = `${options.credentials.provider}:${options.credentials.id}`;
    const region = options.region || 'us-east-1';

    switch (options.credentials.provider) {
      case 'aws':
        this.computeProviders.set(
          key,
          new AWSComputeProvider(options.credentials, region)
        );
        this.containerProviders.set(
          key,
          new AWSContainerProvider(options.credentials, region)
        );
        this.dnsProviders.set(
          key,
          new AWSDnsProvider(options.credentials, region)
        );
        break;

      case 'oci':
        // TODO: Implement OCI providers
        break;

      case 'docker':
        // TODO: Implement Docker provider (connects to AEIMS Agent)
        break;

      default:
        throw new Error(`Unsupported provider: ${options.credentials.provider}`);
    }
  }

  // Register DNS Science provider (adsdnsgo)
  registerDNSScienceProvider(credentials: DNSScienceCredentials): void {
    const key = `dnsscience:${credentials.apiKeyId}`;
    this.dnsScienceProviders.set(key, new DNSScienceProvider(credentials));
  }

  // Register ADS Build provider
  registerBuildProvider(credentials: ProviderCredentials): void {
    const key = `adsbuild:${credentials.id || 'default'}`;
    this.buildProviders.set(key, new ADSBuildProvider(credentials));
  }

  // Get build provider
  getBuildProvider(keyId?: string): IBuildProvider | undefined {
    if (keyId) {
      return this.buildProviders.get(`adsbuild:${keyId}`);
    }
    // Return first registered provider if no key specified
    const providers = Array.from(this.buildProviders.values());
    return providers[0];
  }

  // Get all build providers
  getBuildProviders(): IBuildProvider[] {
    return Array.from(this.buildProviders.values());
  }

  // Get DNS Science provider
  getDNSScienceProvider(keyId?: string): DNSScienceProvider | undefined {
    if (keyId) {
      return this.dnsScienceProviders.get(`dnsscience:${keyId}`);
    }
    // Return first registered provider if no key specified
    const providers = Array.from(this.dnsScienceProviders.values());
    return providers[0];
  }

  // Get all DNS Science providers
  getDNSScienceProviders(): DNSScienceProvider[] {
    return Array.from(this.dnsScienceProviders.values());
  }

  // Get all registered compute providers
  getComputeProviders(): IComputeProvider[] {
    return Array.from(this.computeProviders.values());
  }

  // Get compute provider by key
  getComputeProvider(key: string): IComputeProvider | undefined {
    return this.computeProviders.get(key);
  }

  // Get all container providers
  getContainerProviders(): IContainerProvider[] {
    return Array.from(this.containerProviders.values());
  }

  // Get container provider by key
  getContainerProvider(key: string): IContainerProvider | undefined {
    return this.containerProviders.get(key);
  }

  // Get all DNS providers
  getDnsProviders(): IDnsProvider[] {
    return Array.from(this.dnsProviders.values());
  }

  // Get DNS provider by key
  getDnsProvider(key: string): IDnsProvider | undefined {
    return this.dnsProviders.get(key);
  }

  // Get provider by type and credential ID
  getProvider<T extends 'compute' | 'container' | 'dns'>(
    type: T,
    provider: CloudProvider,
    credentialId: string
  ): T extends 'compute'
    ? IComputeProvider | undefined
    : T extends 'container'
    ? IContainerProvider | undefined
    : IDnsProvider | undefined {
    const key = `${provider}:${credentialId}`;

    switch (type) {
      case 'compute':
        return this.computeProviders.get(key) as any;
      case 'container':
        return this.containerProviders.get(key) as any;
      case 'dns':
        return this.dnsProviders.get(key) as any;
      default:
        return undefined as any;
    }
  }
}

// Singleton registry instance
let registryInstance: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry();
  }
  return registryInstance;
}

// =============================================================================
// Unified Provider Interface
// =============================================================================

// Aggregates data from all registered providers
export class UnifiedProvider {
  constructor(private registry: ProviderRegistry) {}

  // Get all compute instances across all providers
  async listAllInstances() {
    const providers = this.registry.getComputeProviders();
    const results = await Promise.allSettled(
      providers.map((p) => p.listInstances())
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<any>).value);
  }

  // Get all containers across all providers
  async listAllContainers() {
    const providers = this.registry.getContainerProviders();
    const results = await Promise.allSettled(
      providers.map((p) => p.listContainers())
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<any>).value);
  }

  // Get all DNS zones across all providers
  async listAllDnsZones() {
    const providers = this.registry.getDnsProviders();
    const results = await Promise.allSettled(
      providers.map((p) => p.listZones())
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<any>).value);
  }
}
