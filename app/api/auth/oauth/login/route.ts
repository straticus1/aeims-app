import { NextRequest, NextResponse } from 'next/server'
import { generateState, getAuthorizationUrl } from '@/lib/auth/oauth'
import { cookies } from 'next/headers'

/**
 * OAuth Login Endpoint
 * Redirects user to Authentik for authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Generate state for CSRF protection
    const state = generateState()

    // Store state in cookie for verification on callback
    const cookieStore = await cookies()
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    // Get authorization URL and redirect
    const authUrl = getAuthorizationUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('OAuth login error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth login' },
      { status: 500 }
    )
  }
}
