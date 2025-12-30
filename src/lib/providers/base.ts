// AEIMS - Base Provider Interface
// All cloud providers must implement this interface for consistency

import type {
  CloudProvider,
  ComputeInstance,
  Container,
  ContainerService,
  DnsZone,
  DnsRecord,
  CostSummary,
  ProviderCredentials,
} from '@/types';

export interface IComputeProvider {
  listInstances(): Promise<ComputeInstance[]>;
  getInstance(id: string): Promise<ComputeInstance | null>;
  startInstance(id: string): Promise<boolean>;
  stopInstance(id: string): Promise<boolean>;
  rebootInstance(id: string): Promise<boolean>;
  terminateInstance(id: string): Promise<boolean>;
}

export interface IContainerProvider {
  listContainers(): Promise<Container[]>;
  getContainer(id: string): Promise<Container | null>;
  startContainer(id: string): Promise<boolean>;
  stopContainer(id: string): Promise<boolean>;
  restartContainer(id: string): Promise<boolean>;
  getLogs(id: string, tail?: number): Promise<string>;

  // Service-level operations (ECS, OKE, etc.)
  listServices?(): Promise<ContainerService[]>;
  getService?(id: string): Promise<ContainerService | null>;
  updateServiceCount?(id: string, count: number): Promise<boolean>;
}

export interface IDnsProvider {
  listZones(): Promise<DnsZone[]>;
  getZone(id: string): Promise<DnsZone | null>;
  listRecords(zoneId: string): Promise<DnsRecord[]>;
  createRecord(zoneId: string, record: Omit<DnsRecord, 'id' | 'zoneId' | 'provider' | 'providerId'>): Promise<DnsRecord>;
  updateRecord(zoneId: string, recordId: string, record: Partial<DnsRecord>): Promise<DnsRecord>;
  deleteRecord(zoneId: string, recordId: string): Promise<boolean>;
}

export interface ICostProvider {
  getCostSummary(startDate: Date, endDate: Date): Promise<CostSummary>;
  getDetailedCosts(startDate: Date, endDate: Date): Promise<CostSummary>;
}

export interface ISecretsProvider {
  listSecrets(): Promise<{ id: string; name: string; lastModified: Date }[]>;
  getSecretValue(id: string): Promise<string>;
  createSecret(name: string, value: string): Promise<string>;
  updateSecret(id: string, value: string): Promise<boolean>;
  deleteSecret(id: string): Promise<boolean>;
}

// Base provider class that all implementations extend
export abstract class BaseProvider {
  protected provider: CloudProvider;
  protected credentials: ProviderCredentials;
  protected region?: string;

  constructor(provider: CloudProvider, credentials: ProviderCredentials, region?: string) {
    this.provider = provider;
    this.credentials = credentials;
    this.region = region;
  }

  abstract testConnection(): Promise<boolean>;

  getProviderType(): CloudProvider {
    return this.provider;
  }

  getRegion(): string | undefined {
    return this.region;
  }
}

// Provider factory type
export type ProviderFactory = {
  createComputeProvider(credentials: ProviderCredentials, region?: string): IComputeProvider;
  createContainerProvider(credentials: ProviderCredentials, region?: string): IContainerProvider;
  createDnsProvider(credentials: ProviderCredentials, region?: string): IDnsProvider;
  createCostProvider?(credentials: ProviderCredentials): ICostProvider;
  createSecretsProvider?(credentials: ProviderCredentials, region?: string): ISecretsProvider;
};
