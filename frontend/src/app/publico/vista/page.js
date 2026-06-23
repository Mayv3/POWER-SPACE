import VistaClient from './VistaClient'
import { fetchEstadoCompetenciaServer } from '../../../lib/supabaseServer'

// Estado en vivo: render dinámico por request, sin cache estática.
export const dynamic = 'force-dynamic'

export default async function VistaPage() {
  let initialEstado = null
  try {
    initialEstado = await fetchEstadoCompetenciaServer()
  } catch (e) {
    console.error('SSR /publico/vista fetch inicial falló:', e)
  }
  return <VistaClient initialEstado={initialEstado} />
}
