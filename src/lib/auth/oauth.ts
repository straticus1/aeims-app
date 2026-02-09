/**
 * Authentik OAuth Integration
 *
 * Handles OAuth authentication flow with Authentik SSO provider
 */

import { NextRequest } from 'next/server'
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose'

interface AuthentikConfig {
  url: string
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

interface TokenResponse {
  access_token: string
  id_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
}

interface UserInfo {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  groups?: string[]
}

// Load OAuth configuration from environment
export function getOAuthConfig(): AuthentikConfig {
  return {
    url: process.env.AUTHENTIK_URL || '',
    issuer: process.env.AUTHENTIK_ISSUER || '',
    clientId: process.env.AUTHENTIK_CLIENT_ID || '',
    clientSecret: process.env.AUTHENTIK_CLIENT_SECRET || '',
    redirectUri: process.env.AUTHENTIK_REDIRECT_URI || '',
    scopes: (process.env.AUTHENTIK_SCOPES || 'openid,profile,email').split(','),
  }
}

// Generate random state for CSRF protection
export function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Build authorization URL
export function getAuthorizationUrl(state: string): string {
  const config = getOAuthConfig()
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  })

  return `${config.issuer}authorize?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const config = getOAuthConfig()

  const response = await fetch(`${config.issuer}token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

// Get user info from access token
export async function getUserInfo(accessToken: string): Promise<UserInfo> {
  const config = getOAuthConfig()

  const response = await fetch(`${config.issuer}userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${error}`)
  }

  return response.json()
}

// Verify and decode ID token with signature validation
export async function verifyIdToken(idToken: string): Promise<JWTPayload> {
  const config = getOAuthConfig()

  // Create JWKS endpoint from issuer
  const jwksUrl = new URL(`${config.issuer.replace(/\/$/, '')}/jwks`)
  const JWKS = createRemoteJWKSet(jwksUrl)

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: config.issuer.replace(/\/$/, ''),
      audience: config.clientId,
    })

    return payload
  } catch (error) {
    throw new Error(`ID token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Legacy decode function (unsafe - kept for backwards compatibility, use verifyIdToken instead)
export function decodeIdToken(idToken: string): any {
  console.warn('⚠️  decodeIdToken is deprecated and unsafe. Use verifyIdToken() instead.')
  const parts = idToken.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format')
  }

  const payload = parts[1]
  const decoded = Buffer.from(payload, 'base64').toString('utf8')
  return JSON.parse(decoded)
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const config = getOAuthConfig()

  const response = await fetch(`${config.issuer}token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

// Logout from Authentik
export function getLogoutUrl(idToken?: string): string {
  const config = getOAuthConfig()
  const params = new URLSearchParams()

  if (idToken) {
    params.set('id_token_hint', idToken)
  }

  params.set('post_logout_redirect_uri', config.url)

  return `${config.issuer}end-session?${params.toString()}`
}
