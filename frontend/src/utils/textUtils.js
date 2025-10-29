/**
 * Capitaliza la primera letra de cada palabra
 * @param {string} str - El texto a capitalizar
 * @returns {string} - Texto con la primera letra de cada palabra en mayúscula
 */
export const capitalizeWords = (str) => {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Capitaliza solo la primera letra del texto completo
 * @param {string} str - El texto a capitalizar
 * @returns {string} - Texto con la primera letra en mayúscula
 */
export const capitalizeFirst = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}
