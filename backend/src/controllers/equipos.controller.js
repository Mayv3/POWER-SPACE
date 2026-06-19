import { supabase } from "../services/supabaseClient.js";

export async function getEquipos(req, res) {
    try {
        const { data, error } = await supabase
            .from("equipos")
            .select("*, coach:coaches(id, nombre)")
            .order("nombre", { ascending: true });

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener equipos:", err.message);
        res.status(500).json({ error: "Error al obtener equipos" });
    }
}

export async function getEquipoById(req, res) {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from("equipos")
            .select("*, coach:coaches(id, nombre)")
            .eq("id", id)
            .single();
        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener equipo por ID:", err.message);
        res.status(500).json({ error: "Error al obtener equipo por ID" });
    }
}

export async function createEquipo(req, res) {
    try {
        const { nombre, foto, color, coach_id } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: "Falta el nombre del equipo" });
        }

        const equipo = {
            nombre,
            foto: foto || null,
            color: color || null,
            coach_id: coach_id || null,
        };

        const { data, error } = await supabase
            .from("equipos")
            .insert([equipo])
            .select("*, coach:coaches(id, nombre)")
            .single();

        if (error) throw error;

        res.status(201).json({
            message: "Equipo creado correctamente",
            equipo: data,
        });
    } catch (err) {
        console.error("Error al crear equipo:", err.message);
        res.status(500).json({ error: "Error al crear equipo" });
    }
}

export async function updateEquipo(req, res) {
    try {
        const { id } = req.params;
        const { nombre, foto, color, coach_id } = req.body;

        const updatedData = {
            nombre,
            foto: foto || null,
            color: color || null,
            coach_id: coach_id || null,
        };

        const { data, error } = await supabase
            .from("equipos")
            .update(updatedData)
            .eq("id", id)
            .select("*, coach:coaches(id, nombre)")
            .single();

        if (error) throw error;

        res.status(200).json({
            message: "Equipo actualizado correctamente",
            equipo: data,
        });
    } catch (err) {
        console.error("Error al actualizar equipo:", err.message);
        res.status(500).json({ error: "Error al actualizar equipo" });
    }
}

export async function deleteEquipo(req, res) {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("equipos")
            .delete()
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ message: "Equipo eliminado correctamente", equipo: data });
    } catch (err) {
        console.error("Error al eliminar equipo:", err.message);
        res.status(500).json({ error: "Error al eliminar equipo" });
    }
}
