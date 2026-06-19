import { supabase } from "../services/supabaseClient.js";

export async function getAtletas(req, res) {
    try {
        const { data, error } = await supabase
            .from("atletas")
            .select("*, equipo:equipos(id, nombre, color, foto)")
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
            sexo,
            altura_rack_sentadilla,
            altura_rack_banco,
            equipo_id,
            foto
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
            altura_rack_sentadilla,
            altura_rack_banco,
            equipo_id: equipo_id || null,
            foto: foto || null,
            created_at: new Date()
        };

        // Generar numero de Lot aleatorio (1-99) unico entre los atletas anotados
        const { data: lotsUsados, error: lotError } = await supabase
            .from("atletas")
            .select("lot")
            .not("lot", "is", null);
        if (lotError) throw lotError;

        const ocupados = new Set((lotsUsados || []).map(a => a.lot));
        const disponibles = [];
        for (let n = 1; n <= 99; n++) {
            if (!ocupados.has(n)) disponibles.push(n);
        }
        if (disponibles.length === 0) {
            return res.status(409).json({ error: "No hay numeros de Lot disponibles (maximo 99 atletas)" });
        }

        // Intentar insertar reasignando el lot si otro proceso lo tomo (colision UNIQUE 23505)
        let data = null;
        let lastError = null;
        const intentos = Math.min(disponibles.length, 10);
        for (let i = 0; i < intentos; i++) {
            const lot = disponibles[Math.floor(Math.random() * disponibles.length)];
            const { data: inserted, error } = await supabase
                .from("atletas")
                .insert([{ ...atleta, lot }])
                .select()
                .single();

            if (!error) { data = inserted; break; }
            if (error.code === "23505") { lastError = error; continue; }
            throw error;
        }
        if (!data) throw (lastError || new Error("No se pudo asignar el numero de Lot"));

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
            sexo,
            altura_rack_sentadilla,
            altura_rack_banco,
            equipo_id,
            foto
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
            sexo,
            altura_rack_sentadilla,
            altura_rack_banco,
            equipo_id: equipo_id || null,
            foto: foto || null
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

