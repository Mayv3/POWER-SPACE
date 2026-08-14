// El tanda_id sigue siendo numérico (1-7) en toda la app: FK, filtros, colores,
// orden. Esto solo mapea el número a la letra que se muestra al usuario.
export const TANDA_IDS = [1, 2, 3, 4, 5, 6, 7]

const LETRAS = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G' }

export const letraTanda = (tandaId) => LETRAS[tandaId] || tandaId
