// AEIMS - DNS Science Provider Integration
// Provides DNS debugging, security analysis, and dnsscience.io integration

import type { ProviderCredentials } from '@/types';
import { BaseProvider } from './base';

export interface DNSScienceCredentials extends ProviderCredentials {
  apiKey: string;
  apiKeyId: string;
  endpoint: string;
}

export interface DNSQueryResult {
  domain: string;
  type: string;
  records: string[];
  ttl?: number;
  status: 'success' | 'error';
  error?: string;
  timing?: {
    queryTimeMs: number;
    server: string;
  };
}

export interface SPFResult {
  domain: string;
  spfRecords: string[];
  valid: boolean;
  policy?: string;
  dnsLookups?: number;
  status: 'success' | 'error';
}

export interface DKIMResult {
  domain: string;
  selectorsFound: Array<{
    selector: string;
    record: string;
    keyType?: string;
    keySize?: number;
  }>;
  status: 'success' | 'error';
}

export interface DMARCResult {
  domain: string;
  dmarcRecord: string | null;
  enabled: boolean;
  policy: string | null;
  subdomainPolicy?: string;
  percentage?: number;
  aggregateReports?: string[];
  forensicReports?: string[];
  status: 'success' | 'error';
}

export interface DNSSECResult {
  domain: string;
  enabled: boolean;
  valid: boolean;
  algorithm?: string;
  keyTag?: number;
  chainStatus?: 'secure' | 'insecure' | 'bogus';
  status: 'success' | 'error';
}

export interface EmailSecurityScan {
  domain: string;
  timestamp: string;
  securityScore: number;
  securityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  dnssec: DNSSECResult;
  spf: SPFResult;
  dkim: DKIMResult;
  dmarc: DMARCResult;
  mtaSts?: {
    enabled: boolean;
    mode?: string;
    maxAge?: number;
  };
  starttls?: {
    port25: boolean;
    port587: boolean;
  };
}

export interface DNSScienceHealth {
  status: 'healthy' | 'unhealthy';
  service: string;
  timestamp: string;
  version?: string;
}

// DNS Science Provider for AEIMS
export class DNSScienceProvider extends BaseProvider {
  private apiKey: string;
  private apiKeyId: string;
  private endpoint: string;

  constructor(credentials: DNSScienceCredentials) {
    super('oci', credentials); // Using OCI as base provider
    this.apiKey = credentials.apiKey;
    this.apiKeyId = credentials.apiKeyId;
    this.endpoint = credentials.endpoint.replace(/\/$/, '');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.endpoint}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Key-ID': this.apiKeyId,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`DNS Science API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.request<DNSScienceHealth>('/health');
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<DNSScienceHealth> {
    return this.request<DNSScienceHealth>('/health');
  }

  async getInfo(): Promise<{
    service: string;
    version: string;
    capabilities: string[];
    apiKeyId: string;
  }> {
    return this.request('/api/info');
  }

  // DNS Query operations
  async query(domain: string, type: string = 'A'): Promise<DNSQueryResult> {
    return this.request<DNSQueryResult>(`/api/query/${encodeURIComponent(domain)}?type=${type}`);
  }

  async queryAll(domain: string): Promise<Record<string, DNSQueryResult>> {
    const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME'];
    const results: Record<string, DNSQueryResult> = {};

    await Promise.all(
      types.map(async (type) => {
        try {
          results[type] = await this.query(domain, type);
        } catch (e) {
          results[type] = {
            domain,
            type,
            records: [],
            status: 'error',
            error: e instanceof Error ? e.message : 'Unknown error',
          };
        }
      })
    );

    return results;
  }

  // Email Security operations
  async checkSPF(domain: string): Promise<SPFResult> {
    return this.request<SPFResult>(`/api/spf/${encodeURIComponent(domain)}`);
  }

  async checkDKIM(domain: string): Promise<DKIMResult> {
    return this.request<DKIMResult>(`/api/dkim/${encodeURIComponent(domain)}`);
  }

  async checkDMARC(domain: string): Promise<DMARCResult> {
    return this.request<DMARCResult>(`/api/dmarc/${encodeURIComponent(domain)}`);
  }

  async checkDNSSEC(domain: string): Promise<DNSSECResult> {
    return this.request<DNSSECResult>(`/api/dnssec/${encodeURIComponent(domain)}`);
  }

  // Full email security scan
  async scanEmailSecurity(domain: string): Promise<EmailSecurityScan> {
    const [spf, dkim, dmarc] = await Promise.all([
      this.checkSPF(domain),
      this.checkDKIM(domain),
      this.checkDMARC(domain),
    ]);

    // Calculate security score
    let score = 0;
    if (spf.valid) score += 25;
    if (dkim.selectorsFound.length > 0) score += 25;
    if (dmarc.enabled) {
      score += 15;
      if (dmarc.policy === 'reject') score += 20;
      else if (dmarc.policy === 'quarantine') score += 10;
    }

    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    return {
      domain,
      timestamp: new Date().toISOString(),
      securityScore: score,
      securityGrade: grade,
      dnssec: {
        domain,
        enabled: false,
        valid: false,
        status: 'success',
      },
      spf,
      dkim,
      dmarc,
    };
  }

  // Bulk operations
  async scanDomains(domains: string[]): Promise<EmailSecurityScan[]> {
    return Promise.all(domains.map((domain) => this.scanEmailSecurity(domain)));
  }
}

// Factory function for AEIMS integration
export function createDNSScienceProvider(credentials: DNSScienceCredentials): DNSScienceProvider {
  return new DNSScienceProvider(credentials);
}

// Provider capabilities registration
export const DNSSCIENCE_CAPABILITIES = {
  provider: 'dnsscience' as const,
  categories: ['dns'] as const,
  features: {
    dns_query: true,
    dnssec_validation: true,
    spf_check: true,
    dkim_discovery: true,
    dmarc_analysis: true,
    email_security_scan: true,
  },
  operations: [
    'query',
    'queryAll',
    'checkSPF',
    'checkDKIM',
    'checkDMARC',
    'checkDNSSEC',
    'scanEmailSecurity',
    'scanDomains',
  ],
};
