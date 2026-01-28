// AEIMS - IP Reputation API Route
import { NextRequest, NextResponse } from 'next/server';

const DARKAPI_URL = process.env.DARKAPI_URL || 'https://api.darkapi.io';
const DNSSCIENCE_API = process.env.DNSSCIENCE_API_URL || 'https://api.dnsscience.io';
const DARKAPI_KEY = process.env.DARKAPI_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { ip: string } }
) {
  const { ip } = params;

  try {
    // Aggregate from multiple sources
    const results: Record<string, unknown> = {
      ip,
      sources: {},
      checked_at: new Date().toISOString(),
    };

    // DarkAPI IP reputation
    try {
      const darkRes = await fetch(`${DARKAPI_URL}/v1/ip/${ip}`, {
        headers: { 'X-API-Key': DARKAPI_KEY },
      });
      results.sources = { ...(results.sources as object), darkapi: await darkRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), darkapi: { error: (e as Error).message } };
    }

    // CrowdSec
    try {
      const csRes = await fetch(
        `${DNSSCIENCE_API}/api/threat-intel/crowdsec?ip=${encodeURIComponent(ip)}`
      );
      results.sources = { ...(results.sources as object), crowdsec: await csRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), crowdsec: { error: (e as Error).message } };
    }

    // AlienVault OTX
    try {
      const otxRes = await fetch(
        `${DNSSCIENCE_API}/api/threat-intel/alienvault?indicator=${encodeURIComponent(ip)}&type=ip`
      );
      results.sources = { ...(results.sources as object), alienvault_otx: await otxRes.json() };
    } catch (e) {
      results.sources = { ...(results.sources as object), alienvault_otx: { error: (e as Error).message } };
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'IP check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
