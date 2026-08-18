// El tanda_id sigue siendo numérico (1-7) en toda la app: FK, filtros, colores,
// orden. Esto solo mapea el número a la letra que se muestra al usuario.
export const TANDA_IDS = [1, 2, 3, 4, 5, 6, 7]

const LETRAS = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G' }

export const letraTanda = (tandaId) => LETRAS[tandaId] || tandaId

// Un color fijo por tanda (no hash: son solo 7, ids conocidos), elegidos para
// ser bien distinguibles entre sí en matiz y saturación.
export const TANDA_COLORS = {
  1: '#e53935', // rojo
  2: '#1e88e5', // azul
  3: '#43a047', // verde
  4: '#fb8c00', // naranja
  5: '#8e24aa', // violeta
  6: '#00acc1', // celeste
  7: '#6d4c41', // marrón
}

export const colorTanda = (tandaId) => TANDA_COLORS[tandaId] || '#9e9e9e'
