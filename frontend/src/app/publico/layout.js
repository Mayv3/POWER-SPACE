import { Barlow, IBM_Plex_Mono, Oswald } from 'next/font/google'

// Las fuentes se auto-hospedan y se precargan en el <head> en vez de entrar por
// un `@import` de Google dentro de un <style> en el render: el @import es
// serialmente bloqueante (el browser recién descubre la fuente después de
// parsear el style) y se re-serializaba en cada render del cliente.
//
// Este layout es Server Component a propósito: el layout raíz es 'use client'
// y los font loaders se resuelven en build.
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--ps-font-barlow',
})

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--ps-font-oswald',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--ps-font-mono',
})

export default function PublicoLayout({ children }) {
  return (
    <div className={`${barlow.variable} ${oswald.variable} ${plexMono.variable}`}>
      {children}
    </div>
  )
}
