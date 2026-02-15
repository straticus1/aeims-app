import { NextRequest, NextResponse } from 'next/server'
import { generateState, getAuthorizationUrl } from '@/lib/auth/oauth'
import { createHmac } from 'crypto'

/**
 * OAuth Login Endpoint
 * Initiates the OAuth flow by redirecting to Authentik
 */
export async function GET(req: NextRequest) {
  try {
    // Generate state for CSRF protection
    const state = generateState()

    // Sign the state with HMAC to verify it later
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me'
    const signature = createHmac('sha256', secret)
      .update(state)
      .digest('hex')

    // Combine state and signature
    const signedState = `${state}.${signature}`

    console.log('OAuth login initiated, signed state:', signedState.substring(0, 50))

    // Get authorization URL with signed state
    const authUrl = getAuthorizationUrl(signedState)

    console.log('Redirecting to:', authUrl.substring(0, 100))

    // Redirect to Authentik
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('OAuth login error:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'https://aeims.app'
    return NextResponse.redirect(new URL('/login?error=oauth_init_failed', baseUrl))
  }
}
