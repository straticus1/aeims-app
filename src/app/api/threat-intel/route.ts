// AEIMS - Threat Intelligence API Route
// Proxies to DNSScience.io and DarkAPI.io cached threat data

import { NextRequest, NextResponse } from 'next/server';

const DNSSCIENCE_API = process.env.DNSSCIENCE_API_URL || 'https://api.dnsscience.io';
const DARKAPI_URL = process.env.DARKAPI_URL || 'https://api.darkapi.io';
const DARKAPI_KEY = process.env.DARKAPI_KEY || '';

// GET /api/threat-intel - API documentation
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'AEIMS Threat Intelligence API',
    description: 'Pulls from DNSScience.io and DarkAPI.io cached threat data',
    endpoints: [
      'GET /api/threat-intel/ip/[ip] - IP reputation lookup',
      'GET /api/threat-intel/domain/[domain] - Domain reputation lookup',
      'GET /api/threat-intel/otx/[indicator] - AlienVault OTX lookup',
      'GET /api/threat-intel/crowdsec/[ip] - CrowdSec IP lookup',
      'GET /api/threat-intel/safebrowsing?url=... - Google Safe Browsing check',
      'POST /api/threat-intel - Combined multi-source check',
    ],
    sources: ['darkapi.io', 'dnsscience.io'],
    documentation: 'https://docs.aeims.app/threat-intel',
  });
}

// POST /api/threat-intel - Combined threat check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { indicator, type = 'domain' } = body;

    if (!indicator) {
      return NextResponse.json({ error: 'Indicator required' }, { status: 400 });
    }

    const results: Record<string, unknown> = {
      indicator,
      type,
      sources: {},
      checked_at: new Date().toISOString(),
    };

    // Fetch from DarkAPI
    try {
      const darkApiEndpoint = type === 'ip' ? 'ip' : 'domain';
      const darkRes = await fetch(`${DARKAPI_URL}/v1/${darkApiEndpoint}/${indicator}`, {
        headers: { 'X-API-Key': DARKAPI_KEY },
      });
      results.sources = { ...(results.sources as object), darkapi: await darkRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), darkapi: { error: (e as Error).message } };
    }

    // Fetch from DNSScience OTX cache
    try {
      const otxRes = await fetch(
        `${DNSSCIENCE_API}/api/threat-intel/alienvault?indicator=${encodeURIComponent(indicator)}&type=${type}`
      );
      results.sources = { ...(results.sources as object), alienvault_otx: await otxRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), alienvault_otx: { error: (e as Error).message } };
    }

    // For IPs, also check CrowdSec
    if (type === 'ip') {
      try {
        const csRes = await fetch(
          `${DNSSCIENCE_API}/api/threat-intel/crowdsec?ip=${encodeURIComponent(indicator)}`
        );
        results.sources = { ...(results.sources as object), crowdsec: await csRes.json() };
      } catch (e) {
        results.sources = { ...(results.sources as object), crowdsec: { error: (e as Error).message } };
      }
    }

    // For domains/URLs, check Safe Browsing
    if (type === 'domain' || type === 'url') {
      try {
        const urlToCheck = type === 'domain' ? `http://${indicator}` : indicator;
        const sbRes = await fetch(
          `${DNSSCIENCE_API}/api/threat-intel/safebrowsing?url=${encodeURIComponent(urlToCheck)}`
        );
        results.sources = { ...(results.sources as object), safebrowsing: await sbRes.json() };
      } catch (e) {
        results.sources = { ...(results.sources as object), safebrowsing: { error: (e as Error).message } };
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'Combined threat check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
