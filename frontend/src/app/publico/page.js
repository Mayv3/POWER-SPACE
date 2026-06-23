import PublicoClient from './PublicoClient'
import {
  fetchAtletasConIntentosServer,
  fetchEstadoCompetenciaServer,
  fetchAtletaServer,
} from '../../lib/supabaseServer'

// Datos en vivo: render dinámico por request, sin cache estática.
export const dynamic = 'force-dynamic'

export default async function PublicoPage() {
  let initialAtletas = []
  let initialEstado = null
  let initialAtletaEnVivo = null

  try {
    const [atletas, estado] = await Promise.all([
      fetchAtletasConIntentosServer({ tandaId: 'todas' }),
      fetchEstadoCompetenciaServer(),
    ])
    initialAtletas = atletas
    initialEstado = estado
    if (estado?.atleta_id) {
      initialAtletaEnVivo = await fetchAtletaServer(estado.atleta_id)
    }
  } catch (e) {
    // Si el fetch SSR falla, el cliente igual rehidrata y carga por su cuenta.
    console.error('SSR /publico fetch inicial falló:', e)
  }

  return (
    <PublicoClient
      initialAtletas={initialAtletas}
      initialEstado={initialEstado}
      initialAtletaEnVivo={initialAtletaEnVivo}
    />
  )
}
