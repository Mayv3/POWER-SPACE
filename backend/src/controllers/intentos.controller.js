import { supabase } from "../services/supabaseClient.js";

export async function getIntentos(req, res) {
  try {
    const { data, error } = await supabase
      .from("intentos")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error al obtener intentos:", err.message);
    res.status(500).json({ error: "Error al obtener intentos" });
  }
}

export async function getIntentosByAtleta(req, res) {
  try {
    const { atleta_id } = req.params;

    const { data, error } = await supabase
      .from("intentos")
      .select("*")
      .eq("atleta_id", atleta_id)
      .order("movimiento_id", { ascending: true })
      .order("intento_numero", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error al obtener intentos por atleta:", err.message);
    res.status(500).json({ error: "Error al obtener intentos por atleta" });
  }
}

export async function getIntentosByTanda(req, res) {
  try {
    const { tanda_id } = req.params;

    const { data, error } = await supabase
      .from("intentos")
      .select("*, atletas(nombre, apellido, categoria, modalidad, peso_corporal, tanda_id)")
      .eq("atletas.tanda_id", tanda_id)
      .order("atleta_id", { ascending: true })
      .order("movimiento_id", { ascending: true })
      .order("intento_numero", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error al obtener intentos por tanda:", err.message);
    res.status(500).json({ error: "Error al obtener intentos por tanda" });
  }
}

export async function createIntento(req, res) {
  try {
    const { atleta_id, movimiento_id, intento_numero, peso, valido } = req.body;

    if (!atleta_id || !movimiento_id || !intento_numero || peso == null) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const intento = {
      atleta_id,
      movimiento_id,
      intento_numero,
      peso,
      valido,
      created_at: new Date()
    };

    const { data, error } = await supabase
      .from("intentos")
      .insert([intento])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Intento registrado correctamente",
      intento: data
    });
  } catch (err) {
    console.error("Error al crear intento:", err.message);
    res.status(500).json({ error: "Error al crear intento" });
  }
}

export async function updateIntento(req, res) {
  try {
    const { id } = req.params;
    const { peso, valido } = req.body;

    const { data, error } = await supabase
      .from("intentos")
      .update({ peso, valido })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      message: "Intento actualizado correctamente",
      intento: data
    });
  } catch (err) {
    console.error("Error al actualizar intento:", err.message);
    res.status(500).json({ error: "Error al actualizar intento" });
  }
}

export async function deleteIntento(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("intentos")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Intento eliminado correctamente" });
  } catch (err) {
    console.error("Error al eliminar intento:", err.message);
    res.status(500).json({ error: "Error al eliminar intento" });
  }
}