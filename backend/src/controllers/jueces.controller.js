import { supabase } from "../services/supabaseClient.js";

let cronometro = null; // referencia global al setInterval activo

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
  const { valido } = req.body;

  const col = `juez${juezId}_valido`;

  const { error } = await supabase
    .from("estado_competencia")
    .update({ [col]: valido, updated_at: new Date() })
    .eq("id", 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
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
      intento_valido: null,
      updated_at: new Date(),
    })
    .eq("id", 1);

  if (error) return res.status(500).json({ error: error.message });

  if (cronometro) clearInterval(cronometro);

  cronometro = setInterval(async () => {
    const { data, error } = await supabase
      .from("estado_competencia")
      .select("tiempo_restante, corriendo")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Error al leer tiempo:", error.message);
      clearInterval(cronometro);
      return;
    }

    if (!data?.corriendo) {
      clearInterval(cronometro);
      return;
    }

    const nuevoTiempo = (data.tiempo_restante ?? 60) - 1;

    if (nuevoTiempo <= 0) {
      await supabase
        .from("estado_competencia")
        .update({ corriendo: false, tiempo_restante: 0 })
        .eq("id", 1);

      clearInterval(cronometro);
      return;
    }

    await supabase
      .from("estado_competencia")
      .update({ tiempo_restante: nuevoTiempo, updated_at: new Date() })
      .eq("id", 1);
  }, 1000);

  res.json({ ok: true });
}

export async function stopIntento(_req, res) {
  const { error } = await supabase
    .from("estado_competencia")
    .update({ corriendo: false })
    .eq("id", 1);

  if (error) return res.status(500).json({ error: error.message });

  if (cronometro) clearInterval(cronometro);

  res.json({ ok: true });
}

// 🎯 Actualizar atleta actual
export async function updateAtletaActual(req, res) {
  const { atleta_id, ejercicio, intento, peso, orden_proximos } = req.body;

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
