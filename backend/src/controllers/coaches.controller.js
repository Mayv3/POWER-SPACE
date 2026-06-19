import { supabase } from "../services/supabaseClient.js";

export async function getCoaches(req, res) {
    try {
        const { data, error } = await supabase
            .from("coaches")
            .select("*")
            .order("nombre", { ascending: true });

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener coaches:", err.message);
        res.status(500).json({ error: "Error al obtener coaches" });
    }
}

export async function getCoachById(req, res) {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from("coaches")
            .select("*")
            .eq("id", id)
            .single();
        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener coach por ID:", err.message);
        res.status(500).json({ error: "Error al obtener coach por ID" });
    }
}

export async function createCoach(req, res) {
    try {
        const { nombre, foto } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: "Falta el nombre del coach" });
        }

        const { data, error } = await supabase
            .from("coaches")
            .insert([{ nombre, foto: foto || null }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: "Coach creado correctamente",
            coach: data,
        });
    } catch (err) {
        console.error("Error al crear coach:", err.message);
        res.status(500).json({ error: "Error al crear coach" });
    }
}

export async function updateCoach(req, res) {
    try {
        const { id } = req.params;
        const { nombre, foto } = req.body;

        const { data, error } = await supabase
            .from("coaches")
            .update({ nombre, foto: foto || null })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            message: "Coach actualizado correctamente",
            coach: data,
        });
    } catch (err) {
        console.error("Error al actualizar coach:", err.message);
        res.status(500).json({ error: "Error al actualizar coach" });
    }
}

export async function deleteCoach(req, res) {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("coaches")
            .delete()
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        res.status(200).json({ message: "Coach eliminado correctamente", coach: data });
    } catch (err) {
        console.error("Error al eliminar coach:", err.message);
        res.status(500).json({ error: "Error al eliminar coach" });
    }
}
