import { supabase } from "../services/supabaseClient.js";

// GET /api/historico  -> lista de snapshots (mas nuevos primero)
export async function getSnapshots(req, res) {
    try {
        const { data, error } = await supabase
            .from("historico_snapshots")
            .select("*")
            .order("creado_at", { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener snapshots:", err.message);
        res.status(500).json({ error: "Error al obtener el historial" });
    }
}

// POST /api/historico/archivar  { nombre, descripcion }
export async function archivar(req, res) {
    try {
        const { nombre, descripcion } = req.body;
        const { data, error } = await supabase.rpc("historico_archivar", {
            p_nombre: nombre || null,
            p_descripcion: descripcion || null,
        });

        if (error) throw error;
        res.status(201).json({ message: "Datos archivados correctamente", snapshot_id: data });
    } catch (err) {
        console.error("Error al archivar:", err.message);
        res.status(500).json({ error: "Error al archivar los datos" });
    }
}

// POST /api/historico/limpiar  { archivar }
export async function limpiar(req, res) {
    try {
        const { archivar: hacerBackup = true } = req.body;
        const { error } = await supabase.rpc("historico_limpiar", {
            p_archivar: hacerBackup,
        });

        if (error) throw error;
        res.status(200).json({ message: "Tablas de trabajo limpiadas correctamente" });
    } catch (err) {
        console.error("Error al limpiar:", err.message);
        res.status(500).json({ error: "Error al limpiar las tablas" });
    }
}

// GET /api/historico/:id  -> snapshot + registros agrupados por tabla (solo lectura)
export async function getSnapshotDetalle(req, res) {
    try {
        const { id } = req.params;

        const { data: meta, error: metaError } = await supabase
            .from("historico_snapshots")
            .select("*")
            .eq("id", parseInt(id))
            .single();
        if (metaError) throw metaError;

        const { data: regs, error: regsError } = await supabase
            .from("historico_registros")
            .select("tabla, fila")
            .eq("snapshot_id", parseInt(id))
            .order("id", { ascending: true });
        if (regsError) throw regsError;

        const registros = {};
        for (const r of regs || []) {
            if (!registros[r.tabla]) registros[r.tabla] = [];
            registros[r.tabla].push(r.fila);
        }

        res.status(200).json({ ...meta, registros });
    } catch (err) {
        console.error("Error al obtener detalle del snapshot:", err.message);
        res.status(500).json({ error: "Error al obtener el detalle del respaldo" });
    }
}

// DELETE /api/historico/:id
export async function eliminarSnapshot(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase.rpc("historico_eliminar", {
            p_snapshot_id: parseInt(id),
        });

        if (error) throw error;
        res.status(200).json({ message: "Snapshot eliminado correctamente" });
    } catch (err) {
        console.error("Error al eliminar snapshot:", err.message);
        res.status(500).json({ error: "Error al eliminar el snapshot" });
    }
}
