import PublicoClient from './PublicoClient'
import {
  fetchAtletasConIntentosServer,
  fetchEstadoConAtletaServer,
} from '../../lib/supabaseServer'

// Datos en vivo: render dinámico por request, sin cache estática.
export const dynamic = 'force-dynamic'

export default async function PublicoPage() {
  let initialAtletas = []
  let initialEstado = null
  let initialAtletaEnVivo = null

  try {
    // 2 queries en paralelo: el atleta en vivo viene en el join del estado, así
    // que no hay que encadenar un tercer round-trip a sa-east-1 en el TTFB.
    const [atletas, { estado, atleta }] = await Promise.all([
      fetchAtletasConIntentosServer({ tandaId: 'todas' }),
      fetchEstadoConAtletaServer(),
    ])
    initialAtletas = atletas
    initialEstado = estado
    initialAtletaEnVivo = atleta
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
