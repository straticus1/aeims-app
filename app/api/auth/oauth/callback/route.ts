import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, getUserInfo, verifyIdToken } from '@/lib/auth/oauth'
import { createSession } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

/**
 * OAuth Callback Endpoint
 * Handles the redirect from Authentik after user authentication
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL(`/login?error=${error}`, req.url))
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(new URL('/login?error=missing_parameters', req.url))
    }

    // Verify state (CSRF protection)
    const cookieStore = await cookies()
    const savedState = cookieStore.get('oauth_state')?.value

    if (!savedState || savedState !== state) {
      console.error('State mismatch:', { saved: savedState, received: state })
      return NextResponse.redirect(new URL('/login?error=invalid_state', req.url))
    }

    // Clear state cookie
    cookieStore.delete('oauth_state')

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Verify ID token signature (CRITICAL: prevents token forgery)
    await verifyIdToken(tokens.id_token)

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
    const response = NextResponse.redirect(new URL('/', req.url))
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
    return NextResponse.redirect(new URL('/login?error=callback_failed', req.url))
  }
}
