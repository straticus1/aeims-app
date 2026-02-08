import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AEIMS - Advanced Enterprise Intelligence Management System',
  description: 'Enterprise intelligence and management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            * { box-sizing: border-box; padding: 0; margin: 0; }
            html, body {
              max-width: 100vw;
              overflow-x: hidden;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
