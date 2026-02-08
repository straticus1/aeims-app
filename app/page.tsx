import { redirect } from 'next/navigation'

export default function HomePage() {
  // Immediately redirect to OAuth login
  redirect('/api/auth/oauth/login')
}
