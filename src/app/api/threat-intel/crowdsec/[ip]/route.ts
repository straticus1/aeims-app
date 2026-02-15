// AEIMS - CrowdSec API Route
import { NextRequest, NextResponse } from 'next/server';

const DNSSCIENCE_API = process.env.DNSSCIENCE_API_URL || 'https://api.dnsscience.io';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;

  try {
    const response = await fetch(
      `${DNSSCIENCE_API}/api/threat-intel/crowdsec?ip=${encodeURIComponent(ip)}`
    );
    const data = await response.json();
    return NextResponse.json({ source: 'dnsscience-crowdsec-cache', ...data });
  } catch (error) {
    return NextResponse.json(
      { error: 'CrowdSec check failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}
