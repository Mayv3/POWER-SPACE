const categorias = {
  M: ['M - 53kg', 'M - 59kg', 'M - 66kg', 'M - 74kg', 'M - 83kg', 'M - 93kg', 'M - 105kg', 'M - 120kg', 'M - +120kg'],
  F: ['F - 43kg', 'F - 47kg', 'F - 52kg', 'F - 57kg', 'F - 63kg', 'F - 69kg', 'F - 76kg', 'F - 84kg', 'F - +84kg'],
}

export const CATEGORIAS_EDAD = [
  'Sub-Junior',
  'Junior',
  'Open',
  'Master I',
  'Master II',
  'Master III',
  'Master IV',
]

const CATEGORIAS_JUVENILES = new Set(['Sub-Junior', 'Junior'])

// Abreviación estándar de categoría de edad, combinada con sexo: F-SJr, M-O, F-M2, etc.
const CODIGOS_CATEGORIA_EDAD = {
  'Sub-Junior': 'SJr',
  'Junior': 'Jr',
  'Open': 'O',
  'Master I': 'M1',
  'Master II': 'M2',
  'Master III': 'M3',
  'Master IV': 'M4',
}

export function abreviarCategoriaEdad(sexo, categoriaEdad) {
  if (!categoriaEdad) return ''
  const codigo = CODIGOS_CATEGORIA_EDAD[categoriaEdad] || categoriaEdad
  const prefijo = sexo === 'F' ? 'F' : sexo === 'M' ? 'M' : ''
  return prefijo ? `${prefijo}-${codigo}` : codigo
}

export function abreviarCategoriasEdad(sexo, categoriaEdad) {
  const edades = normalizarCategoriasEdad(categoriaEdad)
  return edades.map((edad) => abreviarCategoriaEdad(sexo, edad))
}

function parseFechaLocal(fecha) {
  if (!fecha) return null
  const [year, month, day] = String(fecha).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function calcularEdad(fechaNacimiento, fechaReferencia = new Date()) {
  const nacimiento = parseFechaLocal(fechaNacimiento)
  if (!nacimiento) return null

  let edad = fechaReferencia.getFullYear() - nacimiento.getFullYear()
  const yaCumplio =
    fechaReferencia.getMonth() > nacimiento.getMonth() ||
    (fechaReferencia.getMonth() === nacimiento.getMonth() && fechaReferencia.getDate() >= nacimiento.getDate())

  if (!yaCumplio) edad -= 1
  return edad
}

// Reglas internas del torneo: Open está disponible desde los 14 años
// y puede elegirse también junto con cualquier división Master.
export function categoriasEdadDisponibles(fechaNacimiento, fechaReferencia = new Date()) {
  const nacimiento = parseFechaLocal(fechaNacimiento)
  if (!nacimiento) return []

  const edadCalendario = fechaReferencia.getFullYear() - nacimiento.getFullYear()
  const edadReal = calcularEdad(fechaNacimiento, fechaReferencia)

  if (edadCalendario < 14 || (edadCalendario === 14 && edadReal < 14)) return []
  if (edadCalendario <= 18) return ['Sub-Junior', 'Open']
  if (edadCalendario <= 23) return ['Junior', 'Open']
  if (edadCalendario <= 39) return ['Open']
  if (edadCalendario <= 49) return ['Master I', 'Open']
  if (edadCalendario <= 59) return ['Master II', 'Open']
  if (edadCalendario <= 69) return ['Master III', 'Open']
  return ['Master IV', 'Open']
}

export function categoriasPesoDisponibles(sexo, categoriaEdad) {
  const opciones = categorias[sexo] || []
  const edades = normalizarCategoriasEdad(categoriaEdad)
  if (edades.some((edad) => CATEGORIAS_JUVENILES.has(edad))) return opciones

  return opciones.filter((categoria) => categoria !== 'M - 53kg' && categoria !== 'F - 43kg')
}

export function normalizarCategoriasEdad(valor) {
  if (Array.isArray(valor)) return [...new Set(valor.filter(Boolean))]
  return valor ? [valor] : []
}

export function clavesCategoriasAtleta(atleta) {
  const edades = normalizarCategoriasEdad(atleta?.categoria_edad)
  if (edades.length === 0) return [atleta?.categoria || 'Sin categoría']
  return edades.map((edad) => [abreviarCategoriaEdad(atleta?.sexo, edad), atleta?.categoria].filter(Boolean).join(' · '))
}

export function claveCategoriaAtleta(atleta) {
  const edades = normalizarCategoriasEdad(atleta?.categoria_edad)
  const abreviadas = edades.map((edad) => abreviarCategoriaEdad(atleta?.sexo, edad))
  return [abreviadas.join(' / '), atleta?.categoria].filter(Boolean).join(' · ') || 'Sin categoría'
}

// Clave de categoría compacta para plataforma (cargadores): "M-SJr 43kg",
// sexo incluido en el código de edad, sin guion como separador con el peso.
export function claveCategoriaPlataforma(atleta) {
  const codigos = abreviarCategoriasEdad(atleta?.sexo, atleta?.categoria_edad)
  const pesoSinSexo = atleta?.categoria ? atleta.categoria.replace(/^[MF]\s*-\s*/, '') : ''
  return [codigos.join(' / '), pesoSinSexo].filter(Boolean).join(' ') || 'Sin categoría'
}

export default categorias
