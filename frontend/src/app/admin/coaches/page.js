import { redirect } from 'next/navigation'

export default function CoachesRedirectPage() {
  redirect('/admin/equipos?tab=coaches')
}
