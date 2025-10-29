import { supabase } from "../services/supabaseClient.js";

export async function getAtletas(req, res) {
    try {
        const { data, error } = await supabase
            .from("atletas")
            .select("*")
            .order("tanda_id", { ascending: true })
            .order("apellido", { ascending: true });

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener atletas:", err.message);
        res.status(500).json({ error: "Error al obtener atletas" });
    }
}

export async function getAtletaById(req, res) {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from("atletas")
            .select("*")
            .eq("id", id)
            .single();
        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener atleta por ID:", err.message);
        res.status(500).json({ error: "Error al obtener atleta por ID" });
    }
}

export async function getAtletasByTanda(req, res) {
    const { tandaId } = req.params;

    try {
        const tandaIdNum = parseInt(tandaId);
        if (!tandaIdNum || tandaIdNum < 1 || tandaIdNum > 4) {
            return res.status(400).json({
                error: "ID de tanda inválido. Debe ser 1, 2, 3 o 4"
            });
        }

        const { data, error } = await supabase
            .from("atletas")
            .select("*")
            .eq("tanda_id", tandaIdNum)
            .order("apellido", { ascending: true });

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener atletas por tanda:", err.message);
        res.status(500).json({ error: "Error al obtener atletas por tanda" });
    }
}

export async function getAtletasOrderedByTanda(req, res) {
    try {
        const { data, error } = await supabase
            .from("atletas")
            .select("*")
            .order("tanda_id", { ascending: true })
            .order("apellido", { ascending: true });

        if (error) throw error;

        const atletasOrdenados = data.sort((a, b) => {
            if (a.tanda_id !== b.tanda_id) {
                return a.tanda_id - b.tanda_id;
            }

            const sentadillaA = a.primer_intento_sentadilla || 0;
            const sentadillaB = b.primer_intento_sentadilla || 0;
            if (sentadillaA !== sentadillaB) {
                return sentadillaA - sentadillaB;
            }

            const bancoA = a.primer_intento_banco || 0;
            const bancoB = b.primer_intento_banco || 0;
            if (bancoA !== bancoB) {
                return bancoA - bancoB;
            }

            const pesoMuertoA = a.primer_intento_peso_muerto || 0;
            const pesoMuertoB = b.primer_intento_peso_muerto || 0;
            return pesoMuertoA - pesoMuertoB;
        });

        res.status(200).json(atletasOrdenados);
    } catch (err) {
        console.error("Error al obtener atletas ordenados por tanda:", err.message);
        res.status(500).json({ error: "Error al obtener atletas ordenados por tanda" });
    }
}

export async function createAtleta(req, res) {

    try {
        const {
            nombre,
            apellido,
            dni,
            fecha_nacimiento,
            edad,
            categoria,
            peso_corporal,
            modalidad,
            tanda_id,
            primer_intento_sentadilla,
            primer_intento_banco,
            primer_intento_peso_muerto,
            sexo
        } = req.body;

        console.log(req.body);
        if (!nombre || !apellido || !dni || !categoria || !peso_corporal) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }

        let edadCalculada = null;
        if (fecha_nacimiento) {
            const nacimiento = new Date(fecha_nacimiento);
            const hoy = new Date();
            edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
            const mes = hoy.getMonth() - nacimiento.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
                edadCalculada--;
            }
        }

        const atleta = {
            nombre,
            apellido,
            dni,
            fecha_nacimiento,
            edad: edadCalculada,
            categoria,
            peso_corporal,
            modalidad,
            tanda_id,
            primer_intento_sentadilla,
            primer_intento_banco,
            primer_intento_peso_muerto,
            sexo,
            created_at: new Date()
        };

        const { data, error } = await supabase
            .from("atletas")
            .insert([atleta])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: "Atleta creado correctamente",
            atleta: data,
        });
    } catch (err) {
        console.error("Error al crear atleta:", err.message);
        res.status(500).json({ error: "Error al crear atleta" });
    }
}

export async function updateAtleta(req, res) {
    try {
        const { id } = req.params;
        const {
            nombre,
            apellido,
            dni,
            fecha_nacimiento,
            edad,
            categoria,
            peso_corporal,
            modalidad,
            tanda_id,
            primer_intento_sentadilla,
            segundo_intento_sentadilla,
            tercer_intento_sentadilla,
            primer_intento_banco,
            segundo_intento_banco,
            tercer_intento_banco,
            primer_intento_peso_muerto,
            segundo_intento_peso_muerto,
            tercer_intento_peso_muerto,
            sexo
        } = req.body;

        const updatedData = {
            nombre,
            apellido,
            dni,
            fecha_nacimiento,
            edad,
            categoria,
            peso_corporal,
            modalidad,
            tanda_id,
            primer_intento_sentadilla,
            segundo_intento_sentadilla,
            tercer_intento_sentadilla,
            primer_intento_banco,
            segundo_intento_banco,
            tercer_intento_banco,
            primer_intento_peso_muerto,
            segundo_intento_peso_muerto,
            tercer_intento_peso_muerto,
            sexo
        };

        const { data, error } = await supabase
            .from("atletas")
            .update(updatedData)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            message: "Atleta actualizado correctamente",
            atleta: data
        });
    } catch (err) {
        console.error("Error al actualizar atleta:", err.message);
        res.status(500).json({ error: "Error al actualizar atleta" });
    }
}

export async function deleteAtleta(req, res) {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("atletas")
            .delete()
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ message: "Atleta eliminado correctamente", atleta: data });
    } catch (err) {
        console.error("Error al eliminar atleta:", err.message);
        res.status(500).json({ error: "Error al eliminar atleta" });
    }
}

