export const CATEGORIAS_EDAD = [
    "Sub-Junior",
    "Junior",
    "Open",
    "Master I",
    "Master II",
    "Master III",
    "Master IV",
];

export const CATEGORIAS_PESO = {
    M: ["M - 53kg", "M - 59kg", "M - 66kg", "M - 74kg", "M - 83kg", "M - 93kg", "M - 105kg", "M - 120kg", "M - +120kg"],
    F: ["F - 43kg", "F - 47kg", "F - 52kg", "F - 57kg", "F - 63kg", "F - 69kg", "F - 76kg", "F - 84kg", "F - +84kg"],
};

const CATEGORIAS_JUVENILES = new Set(["Sub-Junior", "Junior"]);

function parseFechaLocal(fecha) {
    if (!fecha) return null;
    const [year, month, day] = String(fecha).slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

export function calcularEdad(fechaNacimiento, fechaReferencia = new Date()) {
    const nacimiento = parseFechaLocal(fechaNacimiento);
    if (!nacimiento) return null;

    let edad = fechaReferencia.getFullYear() - nacimiento.getFullYear();
    const yaCumplio =
        fechaReferencia.getMonth() > nacimiento.getMonth() ||
        (fechaReferencia.getMonth() === nacimiento.getMonth() && fechaReferencia.getDate() >= nacimiento.getDate());

    if (!yaCumplio) edad -= 1;
    return edad;
}

export function categoriasEdadDisponibles(fechaNacimiento, fechaReferencia = new Date()) {
    const nacimiento = parseFechaLocal(fechaNacimiento);
    if (!nacimiento) return [];

    const edadCalendario = fechaReferencia.getFullYear() - nacimiento.getFullYear();
    const edadReal = calcularEdad(fechaNacimiento, fechaReferencia);

    if (edadCalendario < 14 || (edadCalendario === 14 && edadReal < 14)) return [];
    if (edadCalendario <= 18) return ["Sub-Junior", "Open"];
    if (edadCalendario <= 23) return ["Junior", "Open"];
    if (edadCalendario <= 39) return ["Open"];
    if (edadCalendario <= 49) return ["Master I", "Open"];
    if (edadCalendario <= 59) return ["Master II", "Open"];
    if (edadCalendario <= 69) return ["Master III", "Open"];
    return ["Master IV", "Open"];
}

export function categoriasPesoDisponibles(sexo, categoriaEdad) {
    const opciones = CATEGORIAS_PESO[sexo] || [];
    const edades = normalizarCategoriasEdad(categoriaEdad);
    if (edades.some((edad) => CATEGORIAS_JUVENILES.has(edad))) return opciones;
    return opciones.filter((categoria) => categoria !== "M - 53kg" && categoria !== "F - 43kg");
}

export function validarCategoriasAtleta({ fecha_nacimiento, categoria_edad, sexo, categoria }) {
    const edadesPermitidas = categoriasEdadDisponibles(fecha_nacimiento);
    const edadesElegidas = normalizarCategoriasEdad(categoria_edad);
    if (edadesElegidas.length === 0 || edadesElegidas.some((edad) => !edadesPermitidas.includes(edad))) {
        return "La categoría de edad no corresponde a la fecha de nacimiento";
    }

    const pesosPermitidos = categoriasPesoDisponibles(sexo, edadesElegidas);
    if (!pesosPermitidos.includes(categoria)) {
        return "La categoría de peso no corresponde al sexo y categoría de edad";
    }

    return null;
}

export function normalizarCategoriasEdad(valor) {
    if (Array.isArray(valor)) return [...new Set(valor.filter(Boolean))];
    return valor ? [valor] : [];
}

export function clavesCategoriasAtleta(atleta) {
    const edades = normalizarCategoriasEdad(atleta?.categoria_edad);
    if (edades.length === 0) return [atleta?.categoria || "Sin categoría"];
    return edades.map((edad) => [edad, atleta?.categoria].filter(Boolean).join(" · "));
}

export function claveCategoriaAtleta(atleta) {
    const edades = normalizarCategoriasEdad(atleta?.categoria_edad);
    return [edades.join(" / "), atleta?.categoria].filter(Boolean).join(" · ") || "Sin categoría";
}
