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

export async function getAtletasConIntentos(req, res) {
  try {
    const { tanda_id } = req.query;
    
    let atletasQuery = supabase
      .from("atletas")
      .select("*")
      .order("tanda_id", { ascending: true });

    if (tanda_id && tanda_id !== 'todas') {
      atletasQuery = atletasQuery.eq("tanda_id", parseInt(tanda_id));
    }

    const { data: atletas, error: atletasError } = await atletasQuery;
    if (atletasError) throw atletasError;

    const atletasIds = atletas.map(a => a.id);
    
    const { data: intentos, error: intentosError } = await supabase
      .from("intentos")
      .select("*")
      .in("atleta_id", atletasIds);
    
    if (intentosError) throw intentosError;

    const atletasConIntentos = atletas.map(atleta => {
      const intentosAtleta = intentos.filter(i => i.atleta_id === atleta.id);
      
      const getIntento = (movimiento_id, intento_numero) => {
        const intento = intentosAtleta.find(
          i => i.movimiento_id === movimiento_id && i.intento_numero === intento_numero
        );
        return intento ? intento.peso : null;
      };

      const getValidoIntento = (movimiento_id, intento_numero) => {
        const intento = intentosAtleta.find(
          i => i.movimiento_id === movimiento_id && i.intento_numero === intento_numero
        );
        return intento ? intento.valido : null;
      };

      const sentadilla1 = getIntento(1, 1) || atleta.primer_intento_sentadilla;
      const sentadilla2 = getIntento(1, 2);
      const sentadilla3 = getIntento(1, 3);
      const banco1 = getIntento(2, 1) || atleta.primer_intento_banco;
      const banco2 = getIntento(2, 2);
      const banco3 = getIntento(2, 3);
      const pesoMuerto1 = getIntento(3, 1) || atleta.primer_intento_peso_muerto;
      const pesoMuerto2 = getIntento(3, 2);
      const pesoMuerto3 = getIntento(3, 3);

      const validoS1 = getValidoIntento(1, 1);
      const validoS2 = getValidoIntento(1, 2);
      const validoS3 = getValidoIntento(1, 3);
      const validoB1 = getValidoIntento(2, 1);
      const validoB2 = getValidoIntento(2, 2);
      const validoB3 = getValidoIntento(2, 3);
      const validoD1 = getValidoIntento(3, 1);
      const validoD2 = getValidoIntento(3, 2);
      const validoD3 = getValidoIntento(3, 3);

      const mejorSentadilla = Math.max(
        (sentadilla1 && (validoS1 !== false)) ? sentadilla1 : 0, 
        (sentadilla2 && validoS2) ? sentadilla2 : 0, 
        (sentadilla3 && validoS3) ? sentadilla3 : 0
      );
      const mejorBanco = Math.max(
        (banco1 && (validoB1 !== false)) ? banco1 : 0, 
        (banco2 && validoB2) ? banco2 : 0, 
        (banco3 && validoB3) ? banco3 : 0
      );
      const mejorPesoMuerto = Math.max(
        (pesoMuerto1 && (validoD1 !== false)) ? pesoMuerto1 : 0, 
        (pesoMuerto2 && validoD2) ? pesoMuerto2 : 0, 
        (pesoMuerto3 && validoD3) ? pesoMuerto3 : 0
      );
      const total = mejorSentadilla + mejorBanco + mejorPesoMuerto;

      return {
        ...atleta,
        primer_intento_sentadilla: sentadilla1,
        segundo_intento_sentadilla: sentadilla2,
        tercer_intento_sentadilla: sentadilla3,
        primer_intento_banco: banco1,
        segundo_intento_banco: banco2,
        tercer_intento_banco: banco3,
        primer_intento_peso_muerto: pesoMuerto1,
        segundo_intento_peso_muerto: pesoMuerto2,
        tercer_intento_peso_muerto: pesoMuerto3,
        valido_s1: validoS1,
        valido_s2: validoS2,
        valido_s3: validoS3,
        valido_b1: validoB1,
        valido_b2: validoB2,
        valido_b3: validoB3,
        valido_d1: validoD1,
        valido_d2: validoD2,
        valido_d3: validoD3,
        total: total > 0 ? total : null
      };
    });

    atletasConIntentos.sort((a, b) => {
      if (a.tanda_id !== b.tanda_id) {
        return a.tanda_id - b.tanda_id;
      }
      const pesoA = a.primer_intento_sentadilla || 0;
      const pesoB = b.primer_intento_sentadilla || 0;
      return pesoA - pesoB;
    });

    res.status(200).json(atletasConIntentos);
  } catch (err) {
    console.error("Error al obtener atletas con intentos:", err.message);
    res.status(500).json({ error: "Error al obtener atletas con intentos" });
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

export async function upsertIntentoAtleta(req, res) {
  try {
    const { atleta_id, movimiento_id, intento_numero, peso, valido } = req.body;

    const { data, error } = await supabase
      .from("intentos")
      .upsert({
        atleta_id,
        movimiento_id,
        intento_numero,
        peso: peso ?? null,
        valido: valido ?? null
      }, {
        onConflict: "atleta_id,movimiento_id,intento_numero"
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      message: "Intento registrado",
      intento: data
    });

  } catch (err) {
    console.error("Error en upsert:", err);
    res.status(500).json({ error: "Error en upsert" });
  }
}
