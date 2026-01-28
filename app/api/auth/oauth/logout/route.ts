import { NextRequest, NextResponse } from 'next/server'
import { getLogoutUrl } from '@/lib/auth/oauth'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

/**
 * OAuth Logout Endpoint
 * Logs user out from both local app and Authentik
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    let idToken: string | undefined

    if (sessionToken) {
      // Get session from database
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
      })

      if (session && session.metadata) {
        const metadata = session.metadata as any
        idToken = metadata.idToken
      }

      // Delete session from database
      await prisma.session.delete({
        where: { token: sessionToken },
      }).catch(() => {
        // Session might not exist, that's ok
      })
    }

    // Clear session cookie
    cookieStore.delete('session')

    // Get Authentik logout URL
    const logoutUrl = getLogoutUrl(idToken)

    return NextResponse.json({ logoutUrl })
  } catch (error) {
    console.error('OAuth logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Support GET for simple logout redirect
  const cookieStore = await cookies()
  cookieStore.delete('session')

  const logoutUrl = getLogoutUrl()
  return NextResponse.redirect(logoutUrl)
}
