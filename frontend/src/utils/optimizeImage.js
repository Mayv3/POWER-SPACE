// Reduce y recomprime una imagen en el cliente antes de subirla a Storage.
// Devuelve un File más liviano (WebP, o JPEG si WebP no está disponible).
// Si no logra achicarla, devuelve el original sin tocar.
export async function optimizeImage(file, { maxSize = 1400, quality = 0.86 } = {}) {
  if (!file || !file.type?.startsWith('image/') || typeof document === 'undefined') return file

  let source, width, height, cleanup = () => {}
  try {
    const bitmap = await createImageBitmap(file)
    source = bitmap; width = bitmap.width; height = bitmap.height
    cleanup = () => bitmap.close?.()
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image()
        i.onload = () => res(i); i.onerror = rej; i.src = url
      })
      source = img; width = img.naturalWidth; height = img.naturalHeight
      cleanup = () => URL.revokeObjectURL(url)
    } catch {
      URL.revokeObjectURL(url)
      return file
    }
  }

  const scale = Math.min(1, maxSize / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(source, 0, 0, w, h)
  cleanup()

  const toBlob = (mime) => new Promise(res => canvas.toBlob(res, mime, quality))
  let blob = await toBlob('image/webp')
  let mime = 'image/webp', ext = 'webp'
  if (!blob) { blob = await toBlob('image/jpeg'); mime = 'image/jpeg'; ext = 'jpg' }
  if (!blob || blob.size >= file.size) return file

  const base = (file.name || 'foto').replace(/\.[^.]+$/, '')
  return new File([blob], `${base}.${ext}`, { type: mime })
}
