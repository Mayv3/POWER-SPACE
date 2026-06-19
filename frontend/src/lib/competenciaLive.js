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

// Une el canal. `onEstado(payloadParcial)` se llama con los campos cambiados (merge).
// Devuelve { send, leave }. send(parcial) emite a las demás pantallas (self:false).
export function joinCompetenciaLive(onEstado) {
  const channel = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } })
  if (onEstado) {
    channel.on('broadcast', { event: EVENT }, ({ payload }) => { onEstado(payload) })
  }
  channel.subscribe()

  const send = (parcial) => { channel.send({ type: 'broadcast', event: EVENT, payload: parcial }) }
  const leave = () => { supabase.removeChannel(channel) }
  return { send, leave }
}
