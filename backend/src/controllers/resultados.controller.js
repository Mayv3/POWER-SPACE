import { supabase } from "../services/supabaseClient.js";
import calcDOTS from "../utils/calcularDots.js";

export async function calcularResultados(req, res) {
    try {
        // 1️⃣ Traer atletas con todos los datos necesarios
        const { data: atletas, error: errAtletas } = await supabase
            .from("atletas")
            .select("id, nombre, apellido, sexo, peso_corporal, tanda_id, categoria");
        if (errAtletas) throw errAtletas;

        // 2️⃣ Traer intentos válidos
        const { data: intentos, error: errIntentos } = await supabase
            .from("intentos")
            .select("atleta_id, movimiento_id, peso, valido")
            .eq("valido", true);
        if (errIntentos) throw errIntentos;

        // 3️⃣ Calcular los resultados base con los mejores intentos válidos
        const resultados = atletas.map((a) => {
            const susIntentos = intentos.filter((i) => i.atleta_id === a.id);

            const sentadilla = Math.max(
                ...susIntentos.filter(i => i.movimiento_id === 1).map(i => i.peso),
                0
            );
            const banco = Math.max(
                ...susIntentos.filter(i => i.movimiento_id === 2).map(i => i.peso),
                0
            );
            const peso_muerto = Math.max(
                ...susIntentos.filter(i => i.movimiento_id === 3).map(i => i.peso),
                0
            );

            const total = sentadilla + banco + peso_muerto;
            const dots = calcDOTS(a.sexo || "Masculino", a.peso_corporal, total);

            return {
                atleta_id: a.id,
                nombre: a.nombre,
                apellido: a.apellido,
                sexo: a.sexo || "Masculino",
                peso_corporal: a.peso_corporal,
                tanda_id: a.tanda_id,
                categoria: a.categoria,
                mejores_intentos: {
                    sentadilla,
                    banco,
                    peso_muerto
                },
                total,
                dots
            };
        });

        // 4️⃣ Agrupar por tanda + categoría
        const grupos = {};
        for (const r of resultados) {
            const key = `${r.tanda_id}_${r.categoria}`;
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(r);
        }

        // 5️⃣ Ordenar y asignar puestos dentro de cada grupo
        for (const key in grupos) {
            grupos[key].sort((a, b) => b.dots - a.dots);
            grupos[key].forEach((r, i) => {
                r.puesto = i + 1;
            });
        }

        // 6️⃣ Guardar los resultados en la base
        for (const r of resultados) {
            await supabase
                .from("resultados")
                .upsert({
                    atleta_id: r.atleta_id,
                    total: r.total,
                    dots: r.dots,
                    puesto: r.puesto,
                    updated_at: new Date(),
                }, { onConflict: "atleta_id" });
        }

        // 7️⃣ Devolver respuesta completa
        res.status(200).json({
            message: "Resultados actualizados con ranking por tanda y categoría",
            resultados
        });

    } catch (err) {
        console.error("Error al calcular resultados:", err.message);
        res.status(500).json({ error: "Error al calcular resultados" });
    }
}

export async function getResultados(req, res) {
    try {
        const { data, error } = await supabase
            .from("resultados")
            .select("*, atletas(nombre, apellido, categoria, modalidad, peso_corporal, sexo)")
            .order("dots", { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        console.error("Error al obtener resultados:", err.message);
        res.status(500).json({ error: "Error al obtener resultados" });
    }
}
