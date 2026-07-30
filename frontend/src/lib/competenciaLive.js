import { supabase } from './supabaseClient'

// Canal de Broadcast para overlay INSTANTÁNEO del estado en vivo (luces de jueces,
// atleta seleccionado, arranque de cronómetro). Broadcast no pasa por el WAL, así que
// llega en ~50-150ms vs ~300-700ms de postgres_changes.
//
// IMPORTANTE: esto NO reemplaza a postgres_changes. La escritura a `estado_competencia`
// y su postgres_changes siguen siendo la fuente autoritativa; el broadcast solo adelanta
// el render. Si un broadcast se pierde, postgres_changes igual reconcilia el estado real.
const CHANNEL = 'competencia-live'
const EVENT = 'estado'
const REFRESH_EVENT = 'refrescar-atletas'

// Une el canal. `onEstado(payloadParcial)` se llama con los campos cambiados (merge).
// Devuelve { send, leave }. send(parcial) emite a las demás pantallas (self:false).
export function joinCompetenciaLive(onEstado, onRefreshAtletas) {
  const channel = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } })
  if (onEstado) {
    channel.on('broadcast', { event: EVENT }, ({ payload }) => { onEstado(payload) })
  }
  if (onRefreshAtletas) {
    channel.on('broadcast', { event: REFRESH_EVENT }, () => { onRefreshAtletas() })
  }
  channel.subscribe()

  const send = (parcial) => { channel.send({ type: 'broadcast', event: EVENT, payload: parcial }) }
  const refreshAtletas = () => {
    channel.send({ type: 'broadcast', event: REFRESH_EVENT, payload: { at: Date.now() } })
  }
  const leave = () => { supabase.removeChannel(channel) }
  return { send, refreshAtletas, leave }
}
