// AEIMS - DNS Science API Route
// Provides DNS debugging and email security scanning via adsdnsgo

import { NextRequest, NextResponse } from 'next/server';
import { getProviderRegistry, type DNSScienceCredentials } from '@/lib/providers';

// Initialize DNS Science provider from environment
function getDNSScienceProvider() {
  const registry = getProviderRegistry();

  // Check if already registered
  let provider = registry.getDNSScienceProvider();
  if (provider) return provider;

  // Register from environment variables
  const credentials: DNSScienceCredentials = {
    provider: 'oci',
    id: process.env.DNSSCIENCE_API_KEY_ID || '',
    name: 'DNS Science Default',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    credentials: {},
    apiKey: process.env.DNSSCIENCE_API_KEY || '',
    apiKeyId: process.env.DNSSCIENCE_API_KEY_ID || '',
    endpoint: process.env.DNSSCIENCE_ENDPOINT || 'http://localhost:5000',
  };

  if (credentials.apiKey && credentials.apiKeyId) {
    registry.registerDNSScienceProvider(credentials);
    return registry.getDNSScienceProvider();
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const domain = searchParams.get('domain');
  const type = searchParams.get('type') || 'A';

  const provider = getDNSScienceProvider();

  if (!provider) {
    return NextResponse.json(
      {
        error: 'DNS Science provider not configured',
        help: 'Set DNSSCIENCE_ENDPOINT, DNSSCIENCE_API_KEY, and DNSSCIENCE_API_KEY_ID environment variables',
      },
      { status: 503 }
    );
  }

  try {
    switch (action) {
      case 'health':
        const health = await provider.getHealth();
        return NextResponse.json(health);

      case 'info':
        const info = await provider.getInfo();
        return NextResponse.json(info);

      case 'query':
        if (!domain) {
          return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
        }
        const queryResult = await provider.query(domain, type);
        return NextResponse.json(queryResult);

      case 'query-all':
        if (!domain) {
          return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
        }
        const allResults = await provider.queryAll(domain);
        return NextResponse.json(allResults);

      case 'spf':
        if (!domain) {
          return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
        }
        const spfResult = await provider.checkSPF(domain);
        return NextResponse.json(spfResult);

      case 'dkim':
        if (!domain) {
          return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
        }
        const dkimResult = await provider.checkDKIM(domain);
        return NextResponse.json(dkimResult);

      case 'dmarc':
        if (!domain) {
          return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
        }
        const dmarcResult = await provider.checkDMARC(domain);
        return NextResponse.json(dmarcResult);

      case 'scan':
        if (!domain) {
          return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
        }
        const scanResult = await provider.scanEmailSecurity(domain);
        return NextResponse.json(scanResult);

      default:
        return NextResponse.json({
          service: 'AEIMS DNS Science',
          actions: ['health', 'info', 'query', 'query-all', 'spf', 'dkim', 'dmarc', 'scan'],
          usage: {
            query: '/api/dns?action=query&domain=example.com&type=A',
            spf: '/api/dns?action=spf&domain=example.com',
            dkim: '/api/dns?action=dkim&domain=example.com',
            dmarc: '/api/dns?action=dmarc&domain=example.com',
            scan: '/api/dns?action=scan&domain=example.com',
          },
        });
    }
  } catch (error) {
    console.error('DNS Science API error:', error);
    return NextResponse.json(
      {
        error: 'DNS Science API error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const provider = getDNSScienceProvider();

  if (!provider) {
    return NextResponse.json(
      { error: 'DNS Science provider not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { action, domains } = body;

    if (action === 'bulk-scan' && Array.isArray(domains)) {
      const results = await provider.scanDomains(domains);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('DNS Science API error:', error);
    return NextResponse.json(
      {
        error: 'DNS Science API error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
