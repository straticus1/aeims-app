// AEIMS - DarkAPI.io Provider Integration
// Provides threat intelligence data from DarkAPI.io and DNSScience.io cached sources

import type { ProviderCredentials } from '@/types';
import { BaseProvider } from './base';

export interface DarkAPICredentials extends ProviderCredentials {
  apiKey: string;
  darkApiUrl?: string;
  dnsScienceUrl?: string;
}

export interface IPReputationResult {
  ip: string;
  reputation_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'clean';
  threat_count: number;
  threat_feeds: string[];
  classification: {
    is_tor_exit: boolean;
    is_vpn: boolean;
    is_proxy: boolean;
    is_datacenter: boolean;
    is_botnet: boolean;
    is_scanner: boolean;
  };
  geo?: {
    country_code: string | null;
    country_name: string | null;
    city: string | null;
  };
  network?: {
    asn: string | null;
    as_name: string | null;
    isp: string | null;
  };
  threats: ThreatIndicator[];
  cached: boolean;
  checked_at: string;
}

export interface DomainReputationResult {
  domain: string;
  reputation_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'clean';
  threat_count: number;
  threat_feeds: string[];
  classification: {
    is_phishing: boolean;
    is_malware: boolean;
    is_spam: boolean;
    is_newly_registered: boolean;
  };
  threats: ThreatIndicator[];
  cached: boolean;
  checked_at: string;
}

export interface ThreatIndicator {
  feed: string;
  type: string;
  name?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  first_seen?: string;
  last_seen?: string;
}

export interface AlienVaultOTXResult {
  domain?: string;
  ip?: string;
  found: boolean;
  pulse_count: number;
  threat_score: number;
  severity: string;
  tags: string[];
  malware_families: string[];
  from_cache?: boolean;
  error?: string;
}

export interface CrowdSecResult {
  ip: string;
  found: boolean;
  ip_range_score: number;
  reputation: string;
  behaviors: string[];
  severity: string;
  location?: {
    country: string | null;
    city: string | null;
  };
  as_info?: {
    as_num: number | null;
    as_name: string | null;
  };
  from_cache?: boolean;
  error?: string;
}

export interface SafeBrowsingResult {
  url: string;
  safe: boolean;
  threats: string[];
  threat_types: string[];
  severity?: string;
  from_cache?: boolean;
  error?: string;
}

export interface CombinedThreatCheck {
  indicator: string;
  type: 'ip' | 'domain' | 'url';
  checked_at: string;
  sources: {
    darkapi?: IPReputationResult | DomainReputationResult;
    alienvault_otx?: AlienVaultOTXResult;
    crowdsec?: CrowdSecResult;
    safebrowsing?: SafeBrowsingResult;
  };
  summary: {
    is_malicious: boolean;
    highest_severity: string;
    threat_count: number;
    sources_checked: number;
  };
}

// DarkAPI Provider for AEIMS
export class DarkAPIProvider extends BaseProvider {
  private apiKey: string;
  private darkApiUrl: string;
  private dnsScienceUrl: string;

  constructor(credentials: DarkAPICredentials) {
    super('darkapi', credentials);
    this.apiKey = credentials.apiKey;
    this.darkApiUrl = (credentials.darkApiUrl || 'https://api.darkapi.io').replace(/\/$/, '');
    this.dnsScienceUrl = (credentials.dnsScienceUrl || 'https://api.dnsscience.io').replace(/\/$/, '');
  }

  private async darkApiRequest<T>(path: string): Promise<T> {
    const response = await fetch(`${this.darkApiUrl}${path}`, {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DarkAPI error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async dnsScienceRequest<T>(path: string): Promise<T> {
    const response = await fetch(`${this.dnsScienceUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DNSScience API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.darkApiUrl}/health`);
      const data = await response.json();
      return data.status === 'healthy';
    } catch {
      return false;
    }
  }

  // IP Reputation (from DarkAPI)
  async checkIP(ip: string): Promise<IPReputationResult> {
    return this.darkApiRequest<IPReputationResult>(`/v1/ip/${ip}`);
  }

  // Domain Reputation (from DarkAPI)
  async checkDomain(domain: string): Promise<DomainReputationResult> {
    return this.darkApiRequest<DomainReputationResult>(`/v1/domain/${domain}`);
  }

  // AlienVault OTX (from DNSScience cache)
  async checkOTX(indicator: string, type: 'domain' | 'ip' = 'domain'): Promise<AlienVaultOTXResult> {
    return this.dnsScienceRequest<AlienVaultOTXResult>(
      `/api/threat-intel/alienvault?indicator=${encodeURIComponent(indicator)}&type=${type}`
    );
  }

  // CrowdSec (from DNSScience cache)
  async checkCrowdSec(ip: string): Promise<CrowdSecResult> {
    return this.dnsScienceRequest<CrowdSecResult>(
      `/api/threat-intel/crowdsec?ip=${encodeURIComponent(ip)}`
    );
  }

  // Google Safe Browsing (from DNSScience cache)
  async checkSafeBrowsing(url: string): Promise<SafeBrowsingResult> {
    return this.dnsScienceRequest<SafeBrowsingResult>(
      `/api/threat-intel/safebrowsing?url=${encodeURIComponent(url)}`
    );
  }

  // Combined threat check across all sources
  async combinedCheck(indicator: string, type: 'ip' | 'domain' | 'url' = 'domain'): Promise<CombinedThreatCheck> {
    const result: CombinedThreatCheck = {
      indicator,
      type,
      checked_at: new Date().toISOString(),
      sources: {},
      summary: {
        is_malicious: false,
        highest_severity: 'clean',
        threat_count: 0,
        sources_checked: 0,
      },
    };

    const severityOrder = ['critical', 'high', 'medium', 'low', 'info', 'clean'];

    // Check DarkAPI
    try {
      if (type === 'ip') {
        result.sources.darkapi = await this.checkIP(indicator);
      } else if (type === 'domain') {
        result.sources.darkapi = await this.checkDomain(indicator);
      }
      result.summary.sources_checked++;

      if (result.sources.darkapi && result.sources.darkapi.risk_level !== 'clean') {
        result.summary.is_malicious = true;
        result.summary.threat_count += result.sources.darkapi.threat_count;
        const currentOrder = severityOrder.indexOf(result.summary.highest_severity);
        const newOrder = severityOrder.indexOf(result.sources.darkapi.risk_level);
        if (newOrder < currentOrder) {
          result.summary.highest_severity = result.sources.darkapi.risk_level;
        }
      }
    } catch (e) {
      // Continue with other sources
    }

    // Check AlienVault OTX
    try {
      const otxType = type === 'url' ? 'domain' : type;
      result.sources.alienvault_otx = await this.checkOTX(indicator, otxType);
      result.summary.sources_checked++;

      if (result.sources.alienvault_otx?.found && result.sources.alienvault_otx.threat_score > 0) {
        result.summary.is_malicious = true;
        result.summary.threat_count += result.sources.alienvault_otx.pulse_count;
        const severity = result.sources.alienvault_otx.severity;
        const currentOrder = severityOrder.indexOf(result.summary.highest_severity);
        const newOrder = severityOrder.indexOf(severity);
        if (newOrder >= 0 && newOrder < currentOrder) {
          result.summary.highest_severity = severity;
        }
      }
    } catch (e) {
      // Continue with other sources
    }

    // Check CrowdSec for IPs
    if (type === 'ip') {
      try {
        result.sources.crowdsec = await this.checkCrowdSec(indicator);
        result.summary.sources_checked++;

        if (result.sources.crowdsec?.found && result.sources.crowdsec.ip_range_score > 0) {
          result.summary.is_malicious = true;
          const severity = result.sources.crowdsec.severity;
          const currentOrder = severityOrder.indexOf(result.summary.highest_severity);
          const newOrder = severityOrder.indexOf(severity);
          if (newOrder >= 0 && newOrder < currentOrder) {
            result.summary.highest_severity = severity;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // Check Safe Browsing for URLs/domains
    if (type === 'url' || type === 'domain') {
      try {
        const urlToCheck = type === 'domain' ? `http://${indicator}` : indicator;
        result.sources.safebrowsing = await this.checkSafeBrowsing(urlToCheck);
        result.summary.sources_checked++;

        if (result.sources.safebrowsing && !result.sources.safebrowsing.safe) {
          result.summary.is_malicious = true;
          result.summary.threat_count += result.sources.safebrowsing.threats.length;
          const severity = result.sources.safebrowsing.severity || 'high';
          const currentOrder = severityOrder.indexOf(result.summary.highest_severity);
          const newOrder = severityOrder.indexOf(severity);
          if (newOrder >= 0 && newOrder < currentOrder) {
            result.summary.highest_severity = severity;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    return result;
  }
}

// Factory function for AEIMS integration
export function createDarkAPIProvider(credentials: DarkAPICredentials): DarkAPIProvider {
  return new DarkAPIProvider(credentials);
}

// Provider capabilities registration
export const DARKAPI_CAPABILITIES = {
  provider: 'darkapi' as const,
  categories: ['security', 'threat-intel'] as const,
  features: {
    ip_reputation: true,
    domain_reputation: true,
    alienvault_otx: true,
    crowdsec: true,
    safe_browsing: true,
    combined_check: true,
  },
  operations: [
    'checkIP',
    'checkDomain',
    'checkOTX',
    'checkCrowdSec',
    'checkSafeBrowsing',
    'combinedCheck',
  ],
};
