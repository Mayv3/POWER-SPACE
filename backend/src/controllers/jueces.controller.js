import { supabase } from "../services/supabaseClient.js";

const PESO_FIELD_POR_EJERCICIO = {
  sentadilla: ['primer_intento_sentadilla', 'segundo_intento_sentadilla', 'tercer_intento_sentadilla'],
  banco: ['primer_intento_banco', 'segundo_intento_banco', 'tercer_intento_banco'],
  peso_muerto: ['primer_intento_peso_muerto', 'segundo_intento_peso_muerto', 'tercer_intento_peso_muerto'],
};
const PAUSA_RESULTADO_MS = 5000;
let cancelarAvancePendiente = null;

function esperarResultadoAntesDeAvanzar() {
  cancelarAvancePendiente?.();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cancelarAvancePendiente = null;
      resolve(true);
    }, PAUSA_RESULTADO_MS);
    cancelarAvancePendiente = () => {
      clearTimeout(timeout);
      cancelarAvancePendiente = null;
      resolve(false);
    };
  });
}

// La cola se guarda al seleccionar una celda en Cargadores. Al cerrar un
// intento elegimos el primer atleta que tenga peso cargado para ese ejercicio
// e intento y dejamos el mismo estado que generaría un clic manual.
async function avanzarAlSiguienteAtleta(estado) {
  const pendientes = Array.isArray(estado.orden_proximos)
    ? estado.orden_proximos.map(Number).filter(Number.isInteger)
    : [];
  const pesoField = PESO_FIELD_POR_EJERCICIO[estado.ejercicio]?.[Number(estado.intento) - 1];
  if (!pendientes.length || !pesoField) return null;

  const { data: atletas, error } = await supabase
    .from('atletas_con_intentos')
    .select(`id, nombre, apellido, ${pesoField}`)
    .in('id', pendientes);
  if (error) throw error;

  const porId = new Map((atletas || []).map((atleta) => [Number(atleta.id), atleta]));
  const indice = pendientes.findIndex((id) => Number(porId.get(id)?.[pesoField]) > 0);
  if (indice < 0) return null;

  const atleta = porId.get(pendientes[indice]);
  return {
    atleta_id: atleta.id,
    atleta_nombre: atleta.nombre,
    atleta_apellido: atleta.apellido,
    ejercicio: estado.ejercicio,
    intento: Number(estado.intento),
    peso: Number(atleta[pesoField]),
    corriendo: false,
    tiempo_restante: 60,
    juez1_valido: null,
    juez2_valido: null,
    juez3_valido: null,
    juez1_tipo: null,
    juez2_tipo: null,
    juez3_tipo: null,
    intento_valido: null,
    orden_proximos: pendientes.slice(indice + 1),
    updated_at: new Date(),
  };
}

// 🟢 Obtener estado actual
export async function getEstadoCompetencia(_req, res) {
  const { data, error } = await supabase
    .from("estado_competencia")
    .select("*")
    .eq("id", 1)
    .maybeSingle(); // evita el error "cannot coerce"

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

// 🔴 Actualizar decisión de juez
export async function updateDecisionJuez(req, res) {
  const { juezId } = req.params;
  const { valido, tipo } = req.body;

  if (!['1', '2', '3'].includes(juezId) || typeof valido !== 'boolean') {
    return res.status(400).json({ error: 'Decisión de juez inválida' });
  }

  const colValido = `juez${juezId}_valido`;
  const colTipo = `juez${juezId}_tipo`;

  const updateData = { [colValido]: valido, updated_at: new Date() };
  if (!valido && tipo !== undefined) updateData[colTipo] = tipo;
  else if (valido) updateData[colTipo] = null;

  const { data: estado, error } = await supabase
    .from("estado_competencia")
    .update(updateData)
    .eq("id", 1)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  // El registro del intento pertenece al flujo de jueces, no a una pantalla
  // particular. Al llegar el tercer voto se guarda aquí, por lo que funciona
  // aun con Cargadores cerrado o con los jueces operando desde otro equipo.
  const votos = [estado?.juez1_valido, estado?.juez2_valido, estado?.juez3_valido];
  const todosVotaron = votos.every((voto) => typeof voto === 'boolean');
  const movimientoId = { sentadilla: 1, banco: 2, peso_muerto: 3 }[estado?.ejercicio];
  const intentoNumero = Number(estado?.intento);

  if (todosVotaron && movimientoId && [1, 2, 3].includes(intentoNumero) && estado?.atleta_id && estado.peso != null) {
    const intentoValido = votos.filter((voto) => voto).length >= 2;
    const { error: intentoError } = await supabase
      .from('intentos')
      .upsert({
        atleta_id: estado.atleta_id,
        movimiento_id: movimientoId,
        intento_numero: intentoNumero,
        peso: estado.peso,
        valido: intentoValido,
      }, { onConflict: 'atleta_id,movimiento_id,intento_numero' });

    if (intentoError) return res.status(500).json({ error: intentoError.message });

    // Mostrar el fallo/válido durante cinco segundos antes de cambiar la
    // plataforma. La condición evita tocar el estado si alguien seleccionó
    // manualmente otro atleta durante esa espera.
    await supabase
      .from('estado_competencia')
      .update({ intento_valido: intentoValido, corriendo: false, updated_at: new Date() })
      .eq('id', 1)
      .eq('atleta_id', estado.atleta_id)
      .eq('ejercicio', estado.ejercicio)
      .eq('intento', intentoNumero);

    const debeAvanzar = await esperarResultadoAntesDeAvanzar();
    if (!debeAvanzar) {
      return res.json({ ok: true, intento_registrado: true, valido: intentoValido, siguiente_atleta_id: null, avance_cancelado: true });
    }

    const { data: estadoActual, error: estadoActualError } = await supabase
      .from('estado_competencia')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (estadoActualError) return res.status(500).json({ error: estadoActualError.message });

    const sigueMismoIntento = estadoActual?.atleta_id === estado.atleta_id
      && estadoActual?.ejercicio === estado.ejercicio
      && Number(estadoActual?.intento) === intentoNumero
      && estadoActual?.intento_valido === intentoValido;
    if (!sigueMismoIntento) {
      return res.json({ ok: true, intento_registrado: true, valido: intentoValido, siguiente_atleta_id: null });
    }

    const siguiente = await avanzarAlSiguienteAtleta(estadoActual);
    if (siguiente) {
      await supabase
        .from('estado_competencia')
        .update(siguiente)
        .eq('id', 1)
        .eq('atleta_id', estado.atleta_id)
        .eq('ejercicio', estado.ejercicio)
        .eq('intento', intentoNumero)
        .eq('intento_valido', intentoValido);
    }

    return res.json({ ok: true, intento_registrado: true, valido: intentoValido, siguiente_atleta_id: siguiente?.atleta_id ?? null });
  }

  res.json({ ok: true, intento_registrado: false });
}

// ⏱️ Iniciar intento (solo juez 1)
export async function startIntento(_req, res) {
  // Reiniciar el estado y activar el cronómetro
  const { error } = await supabase
    .from("estado_competencia")
    .update({
      corriendo: true,
      tiempo_restante: 60,
      juez1_valido: null,
      juez2_valido: null,
      juez3_valido: null,
      juez1_tipo: null,
      juez2_tipo: null,
      juez3_tipo: null,
      intento_valido: null,
      updated_at: new Date(),
    })
    .eq("id", 1);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
}

export async function stopIntento(_req, res) {
  const { error } = await supabase
    .from("estado_competencia")
    .update({ corriendo: false })
    .eq("id", 1);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
}

// 🎯 Actualizar atleta actual
export async function updateAtletaActual(req, res) {
  const { atleta_id, ejercicio, intento, peso, orden_proximos } = req.body;

  // Una elección manual prevalece sobre el salto automático pendiente.
  cancelarAvancePendiente?.();

  const updateData = {
    atleta_id: atleta_id,
    ejercicio: ejercicio,
    intento: intento,
    peso: peso,
    corriendo: false,
    tiempo_restante: 60,
    juez1_valido: null,
    juez2_valido: null,
    juez3_valido: null,
    juez1_tipo: null,
    juez2_tipo: null,
    juez3_tipo: null,
    intento_valido: null,
    updated_at: new Date(),
  };

  // Si se proporciona el orden de los próximos atletas, guardarlo
  if (orden_proximos && Array.isArray(orden_proximos)) {
    updateData.orden_proximos = orden_proximos;
  }

  const { error } = await supabase
    .from("estado_competencia")
    .update(updateData)
    .eq("id", 1);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
}
