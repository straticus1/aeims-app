// AEIMS - Domain Reputation API Route
import { NextRequest, NextResponse } from 'next/server';

const DARKAPI_URL = process.env.DARKAPI_URL || 'https://api.darkapi.io';
const DNSSCIENCE_API = process.env.DNSSCIENCE_API_URL || 'https://api.dnsscience.io';
const DARKAPI_KEY = process.env.DARKAPI_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params;

  try {
    const results: Record<string, unknown> = {
      domain,
      sources: {},
      checked_at: new Date().toISOString(),
    };

    // DarkAPI domain reputation
    try {
      const darkRes = await fetch(`${DARKAPI_URL}/v1/domain/${domain}`, {
        headers: { 'X-API-Key': DARKAPI_KEY },
      });
      results.sources = { ...(results.sources as object), darkapi: await darkRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), darkapi: { error: (e as Error).message } };
    }

    // AlienVault OTX
    try {
      const otxRes = await fetch(
        `${DNSSCIENCE_API}/api/threat-intel/alienvault?indicator=${encodeURIComponent(domain)}&type=domain`
      );
      results.sources = { ...(results.sources as object), alienvault_otx: await otxRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), alienvault_otx: { error: (e as Error).message } };
    }

    // Google Safe Browsing
    try {
      const sbRes = await fetch(
        `${DNSSCIENCE_API}/api/threat-intel/safebrowsing?url=${encodeURIComponent(`http://${domain}`)}`
      );
      results.sources = { ...(results.sources as object), safebrowsing: await sbRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), safebrowsing: { error: (e as Error).message } };
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'Domain check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
