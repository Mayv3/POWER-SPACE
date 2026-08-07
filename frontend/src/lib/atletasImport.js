import * as XLSX from 'xlsx'
import { capitalizeWords } from '../utils/textUtils'
import { categoriasEdadDisponibles, categoriasPesoDisponibles } from '../const/categorias/categorias'

const SHEET_ATLETAS = 'Atletas'
const SHEET_INSTRUCCIONES = 'Instrucciones'

export const COLUMNAS = [
  'Nombre',
  'Apellido',
  'DNI',
  'Fecha de nacimiento (AAAA-MM-DD)',
  'Sexo (M/F)',
  'Peso corporal (kg)',
  'Primer intento sentadilla (kg)',
  'Primer intento banco (kg)',
  'Primer intento peso muerto (kg)',
]

// Categoría de edad y de peso se auto-calculan (fecha_nacimiento/peso_corporal + sexo);
// modalidad y tanda se dejan en un valor por defecto editable después desde la ficha.
const MODALIDAD_DEFAULT = 'Powerlifting'
const TANDA_DEFAULT = 1

function normalizarFecha(value) {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const str = String(value).trim()
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

function normalizarSexo(value) {
  const v = String(value || '').trim().toUpperCase()
  if (v === 'M' || v.startsWith('MASC')) return 'M'
  if (v === 'F' || v.startsWith('FEM')) return 'F'
  return ''
}

function normalizarNumero(value) {
  if (value === undefined || value === null || value === '') return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function inferirCategoriaPeso(peso, sexo, categoriaEdad) {
  const opciones = categoriasPesoDisponibles(sexo, categoriaEdad)
  if (opciones.length === 0) return ''
  for (const opcion of opciones) {
    if (opcion.includes('+')) continue
    const match = opcion.match(/(\d+)kg$/)
    if (match && peso <= Number(match[1])) return opcion
  }
  return opciones[opciones.length - 1]
}

const INSTRUCCIONES = [
  ['CÓMO COMPLETAR ESTA PLANTILLA'],
  [''],
  ['1. Completá la hoja "Atletas" — una fila por atleta.'],
  ['2. No cambies los nombres de las columnas (fila 1).'],
  ['3. Fecha de nacimiento: formato AAAA-MM-DD (ejemplo: 1998-05-20).'],
  ['4. Sexo: solo M o F.'],
  ['5. Peso corporal en kg (ejemplo: 82.4).'],
  ['6. Primer intento de sentadilla, banco y peso muerto (kg): opcionales.'],
  [''],
  ['CAMPOS OBLIGATORIOS'],
  ['Nombre, Apellido, DNI, Fecha de nacimiento, Sexo, Peso corporal.'],
  [''],
  ['SE CALCULAN SOLOS (no hace falta completarlos)'],
  ['- Categoría de edad: según la fecha de nacimiento.'],
  ['- Categoría de peso: según el peso corporal y el sexo.'],
  ['- División: "Powerlifting" por defecto.'],
  ['- Tanda: 1 por defecto.'],
  ['Podés ajustar cualquiera de estos valores después desde la ficha de cada atleta.'],
  [''],
  ['OTROS'],
  ['- El equipo no se asigna acá: se hace después desde Equipos → Asignar atletas.'],
  ['- Atletas menores de 14 años no pueden competir; esa fila se va a rechazar al importar.'],
  ['- Una vez completa la hoja "Atletas", subila desde "Importar atletas desde Excel".'],
]

function crearHojaInstrucciones() {
  const ws = XLSX.utils.aoa_to_sheet(INSTRUCCIONES)
  ws['!cols'] = [{ wch: 90 }]
  return ws
}

// Genera y descarga la plantilla .xlsx: hoja de instrucciones + hoja "Atletas"
// con encabezados y 1 fila de ejemplo.
export function descargarPlantillaAtletas() {
  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, crearHojaInstrucciones(), SHEET_INSTRUCCIONES)

  const ejemplo = {
    'Nombre': 'Juan',
    'Apellido': 'Pérez',
    'DNI': '30123456',
    'Fecha de nacimiento (AAAA-MM-DD)': '1998-05-20',
    'Sexo (M/F)': 'M',
    'Peso corporal (kg)': 82.4,
    'Primer intento sentadilla (kg)': 120,
    'Primer intento banco (kg)': 80,
    'Primer intento peso muerto (kg)': 150,
  }
  const wsAtletas = XLSX.utils.json_to_sheet([ejemplo], { header: COLUMNAS })
  wsAtletas['!cols'] = COLUMNAS.map((c) => ({ wch: Math.max(20, c.length) }))
  XLSX.utils.book_append_sheet(wb, wsAtletas, SHEET_ATLETAS)

  XLSX.writeFile(wb, 'plantilla_atletas.xlsx')
}

// Lee el archivo subido y devuelve las filas crudas (una por atleta), tal
// como vienen en la hoja de encabezados de COLUMNAS.
export async function parseArchivoAtletas(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames.includes(SHEET_ATLETAS) ? SHEET_ATLETAS : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

// Valida y mapea una fila cruda al payload que espera POST /api/atletas.
export function mapearFilaAtleta(rawRow) {
  const errores = []

  const nombre = capitalizeWords(String(rawRow['Nombre'] || '').trim())
  const apellido = capitalizeWords(String(rawRow['Apellido'] || '').trim())
  const dni = String(rawRow['DNI'] || '').trim()
  const fecha_nacimiento = normalizarFecha(rawRow['Fecha de nacimiento (AAAA-MM-DD)'])
  const sexo = normalizarSexo(rawRow['Sexo (M/F)'])
  const peso_corporal = normalizarNumero(rawRow['Peso corporal (kg)'])
  const primer_intento_sentadilla = normalizarNumero(rawRow['Primer intento sentadilla (kg)'])
  const primer_intento_banco = normalizarNumero(rawRow['Primer intento banco (kg)'])
  const primer_intento_peso_muerto = normalizarNumero(rawRow['Primer intento peso muerto (kg)'])

  if (!nombre) errores.push('Falta nombre')
  if (!apellido) errores.push('Falta apellido')
  if (!dni) errores.push('Falta DNI')
  if (!fecha_nacimiento) errores.push('Fecha de nacimiento inválida (usar AAAA-MM-DD)')
  if (!sexo) errores.push('Sexo inválido (usar M o F)')
  if (!peso_corporal) errores.push('Peso corporal inválido')

  let categoria_edad = []
  let categoria = ''
  if (fecha_nacimiento) {
    categoria_edad = categoriasEdadDisponibles(fecha_nacimiento)
    if (categoria_edad.length === 0) errores.push('Edad no permitida para competir (menor a 14 años)')
    else if (sexo && peso_corporal) categoria = inferirCategoriaPeso(peso_corporal, sexo, categoria_edad)
  }

  const atleta = {
    nombre,
    apellido,
    dni,
    fecha_nacimiento,
    sexo,
    peso_corporal,
    categoria_edad,
    categoria,
    modalidad: MODALIDAD_DEFAULT,
    tanda_id: TANDA_DEFAULT,
    equipo_id: null,
    primer_intento_sentadilla,
    primer_intento_banco,
    primer_intento_peso_muerto,
    altura_rack_sentadilla: null,
    altura_rack_banco: null,
    foto: null,
  }

  return { atleta, errores }
}
