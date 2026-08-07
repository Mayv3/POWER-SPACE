import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { capitalizeWords } from '../utils/textUtils'
import categoriasPorSexo, { categoriasEdadDisponibles, categoriasPesoDisponibles } from '../const/categorias/categorias'

const SHEET_ATLETAS = 'Atletas'
const SHEET_INSTRUCCIONES = 'Instrucciones'

export const COLUMNAS = [
  'Nombre',
  'Apellido',
  'DNI',
  'Año de nacimiento (AAAA)',
  'Sexo (M/F)',
  'Categoría de peso (kg)',
  'Primer intento sentadilla (kg)',
  'Primer intento banco (kg)',
  'Primer intento peso muerto (kg)',
]

// Categorías de peso disponibles por sexo (ver const/categorias/categorias.js).
// La primera de cada lista (53kg M / 43kg F) es exclusiva de Sub-Junior/Junior.
function tokenDeCategoria(opcion) {
  return opcion.split('-').pop().trim().replace(/kg$/i, '')
}

const TOKENS_CATEGORIA_M = categoriasPorSexo.M.map(tokenDeCategoria)
const TOKENS_CATEGORIA_F = categoriasPorSexo.F.map(tokenDeCategoria)
const TOKENS_CATEGORIA_TODAS = [...TOKENS_CATEGORIA_M, ...TOKENS_CATEGORIA_F]

const CATEGORIAS_PESO_TEXTO = [
  `Hombres (M): ${TOKENS_CATEGORIA_M.map((t, i) => (i === 0 ? `${t}*` : t)).join(', ')}`,
  `Mujeres (F): ${TOKENS_CATEGORIA_F.map((t, i) => (i === 0 ? `${t}*` : t)).join(', ')}`,
  `(*) ${TOKENS_CATEGORIA_M[0]}kg y ${TOKENS_CATEGORIA_F[0]}kg solo para categoría de edad Sub-Junior o Junior.`,
]

// Categoría de edad se auto-calcula (año de nacimiento); la de peso viene del
// excel (categoria_edad se usa solo para validar 53/43kg). Modalidad y tanda
// quedan en un valor por defecto editable después desde la ficha.
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
  m = str.match(/^(\d{4})$/)
  if (m) return `${m[1]}-01-01`
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

// Acepta lo que el usuario tipee para la categoría de peso ("83", "83kg",
// "+120", "M - 83kg", etc.) y la matchea contra las opciones válidas para
// ese sexo/categoría de edad.
function normalizarCategoriaPeso(value, sexo, categoriaEdad) {
  const opciones = categoriasPesoDisponibles(sexo, categoriaEdad)
  if (!value || opciones.length === 0) return ''
  const cleaned = String(value).trim().toUpperCase().replace(/\s+/g, '').replace(/KG$/, '')
  for (const opcion of opciones) {
    const sufijo = opcion.split('-').pop().trim().toUpperCase().replace(/KG$/, '')
    if (sufijo === cleaned) return opcion
  }
  return ''
}

// Placeholder de peso corporal hasta el pesaje real del día del evento:
// el tope de la categoría elegida (ej: "M - 83kg" → 83; "M - +120kg" → 120).
function pesoPlaceholderDesdeCategoria(categoria) {
  const match = String(categoria || '').match(/(\d+)kg$/i)
  return match ? Number(match[1]) : null
}

const INSTRUCCIONES = [
  ['CÓMO COMPLETAR ESTA PLANTILLA'],
  [''],
  ['1. Completá la hoja "Atletas" — una fila por atleta.'],
  ['2. No cambies los nombres de las columnas (fila 1).'],
  ['3. Año de nacimiento: solo el año, 4 dígitos (ejemplo: 1998).'],
  ['4. Sexo: solo M o F.'],
  ['5. Categoría de peso: solo el número en kg de la categoría (ver tabla abajo).'],
  ['6. Primer intento de sentadilla, banco y peso muerto (kg): opcionales.'],
  [''],
  ['CATEGORÍAS DE PESO DISPONIBLES'],
  ...CATEGORIAS_PESO_TEXTO.map((linea) => [linea]),
  [''],
  ['CAMPOS OBLIGATORIOS'],
  ['Nombre, Apellido, DNI, Año de nacimiento, Sexo, Categoría de peso.'],
  [''],
  ['SE CALCULAN SOLOS (no hace falta completarlos)'],
  ['- Categoría de edad: según el año de nacimiento.'],
  ['- División: "Powerlifting" por defecto.'],
  ['- Tanda: 1 por defecto.'],
  ['- Peso corporal: se completa provisorio con el tope de la categoría elegida;'],
  ['  hay que actualizarlo con el peso real el día del pesaje, desde la ficha del atleta.'],
  ['Podés ajustar cualquiera de estos valores después desde la ficha de cada atleta.'],
  [''],
  ['OTROS'],
  ['- El equipo no se asigna acá: se hace después desde Equipos → Asignar atletas.'],
  ['- Atletas menores de 14 años no pueden competir; esa fila se va a rechazar al importar.'],
  ['- Una vez completa la hoja "Atletas", subila desde "Importar atletas desde Excel".'],
]

// Filas de la plantilla con dropdown activo (además de la fila de ejemplo).
const FILAS_CON_DROPDOWN = 500

function descargarBlob(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function aplicarDropdown(worksheet, columnKey, opciones) {
  const columna = worksheet.getColumn(columnKey)
  const formula = `"${opciones.join(',')}"`
  for (let fila = 2; fila <= FILAS_CON_DROPDOWN + 1; fila++) {
    worksheet.getCell(`${columna.letter}${fila}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Valor inválido',
      error: 'Elegí un valor de la lista desplegable.',
    }
  }
}

// Genera y descarga la plantilla .xlsx: hoja de instrucciones + hoja "Atletas"
// con encabezados, 1 fila de ejemplo y dropdowns para Sexo y Categoría de peso.
export async function descargarPlantillaAtletas() {
  const wb = new ExcelJS.Workbook()

  const wsInstr = wb.addWorksheet(SHEET_INSTRUCCIONES)
  wsInstr.columns = [{ width: 90 }]
  INSTRUCCIONES.forEach((fila) => wsInstr.addRow(fila))

  const wsAtletas = wb.addWorksheet(SHEET_ATLETAS)
  wsAtletas.columns = COLUMNAS.map((c) => ({ header: c, key: c, width: Math.max(20, c.length) }))
  wsAtletas.addRow({
    'Nombre': 'Juan',
    'Apellido': 'Pérez',
    'DNI': '30123456',
    'Año de nacimiento (AAAA)': '1998',
    'Sexo (M/F)': 'M',
    'Categoría de peso (kg)': '83',
    'Primer intento sentadilla (kg)': 120,
    'Primer intento banco (kg)': 80,
    'Primer intento peso muerto (kg)': 150,
  })

  aplicarDropdown(wsAtletas, 'Sexo (M/F)', ['M', 'F'])
  aplicarDropdown(wsAtletas, 'Categoría de peso (kg)', TOKENS_CATEGORIA_TODAS)

  const buffer = await wb.xlsx.writeBuffer()
  descargarBlob(buffer, 'plantilla_atletas.xlsx')
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
  const fecha_nacimiento = normalizarFecha(rawRow['Año de nacimiento (AAAA)'])
  const sexo = normalizarSexo(rawRow['Sexo (M/F)'])
  const categoriaRaw = rawRow['Categoría de peso (kg)']
  const primer_intento_sentadilla = normalizarNumero(rawRow['Primer intento sentadilla (kg)'])
  const primer_intento_banco = normalizarNumero(rawRow['Primer intento banco (kg)'])
  const primer_intento_peso_muerto = normalizarNumero(rawRow['Primer intento peso muerto (kg)'])

  if (!nombre) errores.push('Falta nombre')
  if (!apellido) errores.push('Falta apellido')
  if (!dni) errores.push('Falta DNI')
  if (!fecha_nacimiento) errores.push('Año de nacimiento inválido (usar AAAA)')
  if (!sexo) errores.push('Sexo inválido (usar M o F)')
  if (!categoriaRaw) errores.push('Falta categoría de peso')

  let categoria_edad = []
  let categoria = ''
  let peso_corporal = null
  if (fecha_nacimiento) {
    categoria_edad = categoriasEdadDisponibles(fecha_nacimiento)
    if (categoria_edad.length === 0) errores.push('Edad no permitida para competir (menor a 14 años)')
    else if (sexo && categoriaRaw) {
      categoria = normalizarCategoriaPeso(categoriaRaw, sexo, categoria_edad)
      if (!categoria) errores.push('Categoría de peso inválida para ese sexo/edad')
      else peso_corporal = pesoPlaceholderDesdeCategoria(categoria)
    }
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
