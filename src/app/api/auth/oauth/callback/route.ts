import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getUserInfo, decodeIdToken } from '@/lib/auth/oauth'
import { createSession } from '@/lib/auth/session'
import { createHmac } from 'crypto'
import prisma from '@/lib/prisma'

/**
 * OAuth Callback Endpoint
 * Handles the redirect from Authentik after user authentication
 */
export async function GET(req: NextRequest) {
  // Use NEXTAUTH_URL for redirects instead of req.url
  const baseUrl = process.env.NEXTAUTH_URL || 'https://aeims.app'

  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL(`/login?error=${error}`, baseUrl))
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=missing_parameters', baseUrl))
    }

    // Verify state HMAC signature
    const [stateValue, receivedSignature] = state.split('.')

    if (!stateValue || !receivedSignature) {
      console.error('Invalid state format:', { state })
      return NextResponse.redirect(new URL('/login?error=invalid_state', baseUrl))
    }

    // Verify signature
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me'
    const expectedSignature = createHmac('sha256', secret)
      .update(stateValue)
      .digest('hex')

    console.log('State validation:', {
      stateValue: stateValue.substring(0, 20),
      signatureMatch: receivedSignature === expectedSignature
    })

    if (receivedSignature !== expectedSignature) {
      console.error('State signature mismatch')
      return NextResponse.redirect(new URL('/login?error=invalid_state', baseUrl))
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Verify ID token signature (CRITICAL: prevents token forgery)
    decodeIdToken(tokens.id_token)

    // Get user info from Authentik
    const userInfo = await getUserInfo(tokens.access_token)

    // Find or create user in local database
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    })

    if (!user) {
      // Create new user from OAuth data
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          username: userInfo.preferred_username || userInfo.email.split('@')[0],
          displayName: userInfo.name || userInfo.preferred_username || 'User',
          emailVerified: userInfo.email_verified || false,
          isActive: true,
          // OAuth users don't have local passwords
          passwordHash: null,
        },
      })
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { email: userInfo.email },
        data: {
          emailVerified: userInfo.email_verified || user.emailVerified,
          displayName: userInfo.name || user.displayName,
        },
      })
    }

    // Create session
    const session = await createSession(user.id, {
      oauth: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
    })

    // Set session cookie
    const response = NextResponse.redirect(new URL('/', baseUrl))
    response.cookies.set('session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.redirect(new URL('/login?error=callback_failed', baseUrl))
  }
}
