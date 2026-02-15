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
    console.log('[OAuth] Step 1: Exchanging authorization code for tokens...')
    let tokens
    try {
      tokens = await exchangeCodeForTokens(code)
      console.log('[OAuth] ✓ Token exchange successful')
    } catch (error) {
      console.error('[OAuth] ✗ Token exchange failed:', error)
      throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Verify ID token signature (CRITICAL: prevents token forgery)
    console.log('[OAuth] Step 2: Verifying ID token...')
    try {
      decodeIdToken(tokens.id_token)
      console.log('[OAuth] ✓ ID token verified')
    } catch (error) {
      console.error('[OAuth] ✗ ID token verification failed:', error)
      throw new Error(`ID token verification failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Get user info from Authentik
    console.log('[OAuth] Step 3: Fetching user info from Authentik...')
    let userInfo
    try {
      userInfo = await getUserInfo(tokens.access_token)
      console.log('[OAuth] ✓ User info retrieved:', { email: userInfo.email, username: userInfo.preferred_username })
    } catch (error) {
      console.error('[OAuth] ✗ User info fetch failed:', error)
      throw new Error(`User info fetch failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Find or create user in local database
    console.log('[OAuth] Step 4: Looking up user in database:', userInfo.email)
    let user
    try {
      user = await prisma.user.findUnique({
        where: { email: userInfo.email },
      })

      if (user) {
        console.log('[OAuth] ✓ User found in database:', user.id)
      } else {
        console.log('[OAuth] User not found, creating new user...')
      }
    } catch (error) {
      console.error('[OAuth] ✗ Database lookup failed:', error)
      throw new Error(`Database lookup failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    if (!user) {
      // Create new user from OAuth data
      console.log('[OAuth] Step 5: Creating new user...')
      try {
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
        console.log('[OAuth] ✓ User created successfully:', user.id)
      } catch (error) {
        console.error('[OAuth] ✗ User creation failed:', error)
        throw new Error(`User creation failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      // Update existing user
      console.log('[OAuth] Step 5: Updating existing user...')
      try {
        user = await prisma.user.update({
          where: { email: userInfo.email },
          data: {
            emailVerified: userInfo.email_verified || user.emailVerified,
            displayName: userInfo.name || user.displayName,
          },
        })
        console.log('[OAuth] ✓ User updated successfully')
      } catch (error) {
        console.error('[OAuth] ✗ User update failed:', error)
        throw new Error(`User update failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Create session
    console.log('[OAuth] Step 6: Creating session for user:', user.id)
    let session
    try {
      session = await createSession(user.id, {
        oauth: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
      })
      console.log('[OAuth] ✓ Session created:', session.token.substring(0, 20))
    } catch (error) {
      console.error('[OAuth] ✗ Session creation failed:', error)
      throw new Error(`Session creation failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Set session cookie
    console.log('[OAuth] Step 7: Setting session cookie and redirecting to home...')
    const response = NextResponse.redirect(new URL('/', baseUrl))
    response.cookies.set('session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    })

    console.log('[OAuth] ✓✓✓ OAuth callback completed successfully! ✓✓✓')
    return response
  } catch (error) {
    console.error('[OAuth] ✗✗✗ OAuth callback FAILED ✗✗✗')
    console.error('[OAuth] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[OAuth] Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    if (error instanceof Error && error.message) {
      console.error('[OAuth] Failure point:', error.message.split(':')[0])
    }

    return NextResponse.redirect(new URL('/login?error=callback_failed', baseUrl))
  }
}
