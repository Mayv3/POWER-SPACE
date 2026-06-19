// Color determinístico por categoría: la misma categoría siempre obtiene el mismo
// color en todas las tablas (no depende del subconjunto mostrado).
const PALETA = [
  '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
  '#0097a7', '#c2185b', '#afb42b', '#5d4037',
  '#00796b', '#512da8', '#d32f2f', '#455a64',
]

export function colorCategoria(categoria) {
  if (!categoria) return '#9e9e9e'
  const s = String(categoria)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETA[h % PALETA.length]
}
