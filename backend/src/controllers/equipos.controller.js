import { supabase } from "../services/supabaseClient.js";
import { calcIPFGL, calcIPFPoints } from "../utils/calcularIPF.js";

// Puntos por puesto en el ranking absoluto (Tarea 10).
function puntosPorPuesto(puesto) {
    const tabla = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2 };
    return tabla[puesto] ?? 1; // 10°, 11° y demás = 1
}

const r2 = (n) => Math.round(n * 100) / 100;

// Ranking de equipos para premiación.
// 1 ranking absoluto único por IPF GL -> puesto -> puntos -> suma por equipo.
export async function getPremiacionEquipos(req, res) {
    try {
        const { data: atletas, error: errAtletas } = await supabase
            .from("atletas")
            .select("id, nombre, apellido, sexo, peso_corporal, categoria, modalidad, equipo_id");
        if (errAtletas) throw errAtletas;

        const { data: intentos, error: errIntentos } = await supabase
            .from("intentos")
            .select("atleta_id, movimiento_id, peso, valido")
            .eq("valido", true);
        if (errIntentos) throw errIntentos;

        // Mejor intento válido por movimiento + total + si totalizó (válido en los 3).
        const calc = atletas.map((a) => {
            const suyos = intentos.filter((i) => i.atleta_id === a.id);
            const mejor = (mov) => Math.max(0, ...suyos.filter((i) => i.movimiento_id === mov).map((i) => i.peso || 0));
            const sentadilla = mejor(1);
            const banco = mejor(2);
            const peso_muerto = mejor(3);
            const total = sentadilla + banco + peso_muerto;
            const totalizo = sentadilla > 0 && banco > 0 && peso_muerto > 0;

            const ipf_gl = totalizo ? r2(calcIPFGL(a.sexo, a.modalidad, total, a.peso_corporal)) : 0;
            const ipf_points = totalizo ? r2(calcIPFPoints(a.sexo, a.modalidad, total, a.peso_corporal)) : 0;

            return {
                atleta_id: a.id,
                nombre: a.nombre,
                apellido: a.apellido,
                sexo: a.sexo,
                categoria: a.categoria,
                modalidad: a.modalidad,
                peso_corporal: a.peso_corporal,
                equipo_id: a.equipo_id,
                sentadilla, banco, peso_muerto, total,
                totalizo, ipf_gl, ipf_points,
                puesto: null,
                puntos: 0,
            };
        });

        // Ranking absoluto único por IPF GL (solo quienes totalizaron).
        calc
            .filter((a) => a.totalizo && a.total > 0)
            .sort((x, y) => y.ipf_gl - x.ipf_gl)
            .forEach((a, i) => {
                a.puesto = i + 1;
                a.puntos = puntosPorPuesto(i + 1);
            });

        // Equipos + agregación.
        const { data: equipos, error: errEquipos } = await supabase
            .from("equipos")
            .select("*, coach:coaches(id, nombre)");
        if (errEquipos) throw errEquipos;

        const ranking = equipos.map((eq) => {
            const detalle = calc
                .filter((a) => a.equipo_id === eq.id)
                .sort((x, y) => y.puntos - x.puntos || y.ipf_gl - x.ipf_gl);
            // Solo los mejores 5 (ya ordenados por puntos -> GL) suman para el equipo.
            const top5 = detalle.slice(0, 5);
            const cuentan = new Set(top5.map((a) => a.atleta_id));
            detalle.forEach((a) => { a.cuenta_para_equipo = cuentan.has(a.atleta_id); });
            const puntaje = top5.reduce((s, a) => s + a.puntos, 0);
            const suma_gl = r2(top5.reduce((s, a) => s + a.ipf_gl, 0));
            return {
                id: eq.id,
                nombre: eq.nombre,
                color: eq.color,
                foto: eq.foto,
                coach: eq.coach,
                puntaje,
                suma_gl,
                num_atletas: detalle.length,
                num_totalizaron: detalle.filter((a) => a.totalizo).length,
                detalle,
            };
        });

        // Orden de equipos: puntaje desc, desempate suma GL desc, luego nombre.
        ranking.sort((a, b) =>
            b.puntaje - a.puntaje ||
            b.suma_gl - a.suma_gl ||
            (a.nombre || "").localeCompare(b.nombre || "")
        );
        ranking.forEach((eq, i) => { eq.posicion = i + 1; });

        res.status(200).json(ranking);
    } catch (err) {
        console.error("Error al calcular premiación de equipos:", err.message);
        res.status(500).json({ error: "Error al calcular premiación de equipos" });
    }
}

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
