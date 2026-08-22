import { supabase } from "../services/supabaseClient.js";

const PESO_FIELD_POR_EJERCICIO = {
  sentadilla: ['primer_intento_sentadilla', 'segundo_intento_sentadilla', 'tercer_intento_sentadilla'],
  banco: ['primer_intento_banco', 'segundo_intento_banco', 'tercer_intento_banco'],
  peso_muerto: ['primer_intento_peso_muerto', 'segundo_intento_peso_muerto', 'tercer_intento_peso_muerto'],
};
let ultimaSolicitudAtletaMs = 0;

function siguienteMarcaSeleccion() {
  const ahora = Date.now();
  ultimaSolicitudAtletaMs = Math.max(ahora, ultimaSolicitudAtletaMs + 1);
  return new Date(ultimaSolicitudAtletaMs).toISOString();
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
  const { valido, tipo, atleta_id, ejercicio, intento } = req.body;

  const intentoNumeroSolicitado = Number(intento);
  if (
    !['1', '2', '3'].includes(juezId)
    || typeof valido !== 'boolean'
    || !atleta_id
    || !Object.hasOwn(PESO_FIELD_POR_EJERCICIO, ejercicio)
    || ![1, 2, 3].includes(intentoNumeroSolicitado)
  ) {
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
    .eq("corriendo", true)
    .eq("atleta_id", atleta_id)
    .eq("ejercicio", ejercicio)
    .eq("intento", intentoNumeroSolicitado)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!estado) {
    return res.status(409).json({ error: 'El intento cambió o ya no está en curso; el voto fue descartado' });
  }

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

    // El resultado queda mostrado en esta misma plataforma; el cargador elige
    // manualmente a quién sigue (sin avance ni cronómetro automático).
    await supabase
      .from('estado_competencia')
      .update({ intento_valido: intentoValido, corriendo: false, updated_at: new Date() })
      .eq('id', 1)
      .eq('atleta_id', estado.atleta_id)
      .eq('ejercicio', estado.ejercicio)
      .eq('intento', intentoNumero);

    return res.json({ ok: true, intento_registrado: true, valido: intentoValido });
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
  // Se captura al recibir la petición, antes de cualquier await. Dos selecciones
  // pueden resolver la consulta del atleta en orden inverso; este timestamp hace
  // que la última petición recibida sea la única capaz de prevalecer en la DB.
  const solicitadoEn = siguienteMarcaSeleccion();

  // El nombre forma parte de la fila que consumen las pantallas en vivo. Si se
  // actualiza solo atleta_id, postgres_changes reconcilia luego con los nombres
  // del atleta anterior y la vista parece "volver atrás". Lo obtenemos en el
  // servidor para mantener ID y nombre siempre consistentes.
  const { data: atleta, error: atletaError } = await supabase
    .from('atletas')
    .select('nombre, apellido')
    .eq('id', atleta_id)
    .maybeSingle();

  if (atletaError) return res.status(500).json({ error: atletaError.message });
  if (!atleta) return res.status(404).json({ error: 'Atleta no encontrado' });

  const updateData = {
    atleta_id: atleta_id,
    atleta_nombre: atleta.nombre,
    atleta_apellido: atleta.apellido,
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
    updated_at: solicitadoEn,
  };

  // Si se proporciona el orden de los próximos atletas, guardarlo
  if (orden_proximos && Array.isArray(orden_proximos)) {
    updateData.orden_proximos = orden_proximos;
  }

  const { data: estadoActualizado, error } = await supabase
    .from("estado_competencia")
    .update(updateData)
    .eq("id", 1)
    .or(`updated_at.is.null,updated_at.lt.${solicitadoEn}`)
    .select('id')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, aplicado: Boolean(estadoActualizado) });
}
