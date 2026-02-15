import { NextRequest, NextResponse } from 'next/server'
import { getLogoutUrl } from '@/lib/auth/oauth'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

/**
 * OAuth Logout Endpoint
 * Clears the session and redirects to Authentik logout
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    // Delete session from database
    if (sessionToken) {
      await prisma.session.deleteMany({
        where: { token: sessionToken },
      }).catch(() => {})
    }

    // Clear session cookie
    cookieStore.delete('session')

    // Get Authentik logout URL
    const logoutUrl = getLogoutUrl()

    // Redirect to Authentik logout (which will redirect back to our app)
    return NextResponse.redirect(logoutUrl)
  } catch (error) {
    console.error('OAuth logout error:', error)
    // Even if logout fails, clear the session cookie
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('session')
    return response
  }
}
