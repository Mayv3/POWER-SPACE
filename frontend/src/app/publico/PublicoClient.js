'use client'

import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback, memo, Children } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { Calculate_DOTS } from '../../utils/calcularDots'
import { Calculate_IPF_GL } from '../../utils/calcularIPF'
import { colorCategoria } from '../../utils/colorCategoria'
import { capitalizeWords } from '../../utils/textUtils'
import { letraTanda } from '../../const/tandas'
import { supabase, fetchAtletasConIntentos } from '../../lib/supabaseClient'
import { joinCompetenciaLive } from '../../lib/competenciaLive'
import categorias, {
  claveCategoriaAtleta,
  clavesCategoriasAtleta,
  claveCategoriaPlataforma,
} from '../../const/categorias/categorias'

/* ============ TEMA ============ */
const T = {
  pageBg: '#e7e5df', frame: '#08090b', card: '#101318', lime: '#ff6a00',
  line: 'rgba(255,255,255,.07)', line2: 'rgba(255,255,255,.08)',
  txt: '#f4f5f7', txt2: '#9aa0ab', txt3: '#6b7280', txt4: '#4b515c',
  ok: '#dff79a', okBg: 'rgba(192,249,59,.1)', fail: '#ef5a54', failBg: 'rgba(239,90,84,.1)',
}
// Definidas por next/font en publico/layout.js (auto-hospedadas y precargadas).
const FO = 'var(--ps-font-oswald),sans-serif'
const FB = 'var(--ps-font-barlow),sans-serif'
const FM = 'var(--ps-font-mono),monospace'

// Supabase puede entregar una FK como número o string según el origen del
// evento. Una representación canónica evita refrescos y cambios de atleta
// falsos sin convertir IDs grandes a Number.
const normalizarIdAtleta = (id) => id == null || id === '' ? null : String(id)

const LIFTS = [
  { name: 'Sentadilla', key: 'sentadilla', prefix: 's', best: 'mejorSentadilla' },
  { name: 'Press banca', key: 'banco', prefix: 'b', best: 'mejorBanco' },
  { name: 'Peso muerto', key: 'peso_muerto', prefix: 'd', best: 'mejorPesoMuerto' },
]
const LIFT_LABEL = { sentadilla: 'Sentadilla', banco: 'Press banca', peso_muerto: 'Peso muerto' }
const ORD_WORD = ['primer', 'segundo', 'tercer']

// Mapeo de una fila de `intentos` a las columnas que la view agrega por atleta.
// Permite aplicar un UPDATE como patch de una fila en vez de recargar el padrón.
const MOV_LIFT = { 1: 'sentadilla', 2: 'banco', 3: 'peso_muerto' }
const MOV_PREFIX = { 1: 's', 2: 'b', 3: 'd' }

// Si no llega ningún evento de realtime en esta ventana, el polling asume que
// el socket está caído y reconcilia. Con el realtime sano no dispara nunca.
const REALTIME_STALE_MS = 15000

// Constante: se armaba con template literal adentro del render, así que se
// re-serializaba entero en cada actualización del padrón.
const PS_CSS = `
  @keyframes psEq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
  @keyframes psDot{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes psLogoFill{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}
  @keyframes psLogoGlow{0%,100%{filter:drop-shadow(0 0 0 rgba(255,106,0,0))}70%{filter:drop-shadow(0 0 24px rgba(255,106,0,.42))}}
  @keyframes psWordIn{from{opacity:0;transform:translateY(8px);letter-spacing:.28em}to{opacity:1;transform:none;letter-spacing:.16em}}
  .ps-intro{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:#08090b;opacity:1;transition:opacity .45s ease,visibility .45s ease}
  .ps-intro--leaving{opacity:0;visibility:hidden;pointer-events:none}
  .ps-intro-lockup{display:flex;flex-direction:column;align-items:center;gap:18px}
  .ps-intro-mark{position:relative;width:clamp(132px,34vw,210px);aspect-ratio:1;animation:psLogoGlow 2.2s ease-in-out both}
  .ps-intro-mark img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
  .ps-intro-ghost{opacity:.13;filter:grayscale(1)}
  .ps-intro-fill{clip-path:inset(100% 0 0 0);animation:psLogoFill 2.15s cubic-bezier(.65,0,.22,1) forwards}
  .ps-intro-word{font-family:${FO};font-size:clamp(24px,6vw,34px);font-weight:700;line-height:1;color:#f4f5f7;letter-spacing:.16em;padding-left:.16em;animation:psWordIn .55s ease 1.35s both}
  .ps-x{scrollbar-width:none;-ms-overflow-style:none}
  .ps-x::-webkit-scrollbar{display:none;width:0;height:0}
  .ps-bar{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${T.lime},transparent);z-index:99;animation:psBar 1s linear infinite}
  @keyframes psBar{0%{opacity:.3}50%{opacity:1}100%{opacity:.3}}
  .ps-view{animation:psIn .4s cubic-bezier(.22,.61,.36,1) both}
  @keyframes psIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @keyframes psHero{from{transform:scale(1.12);opacity:.3}to{transform:scale(1);opacity:1}}
  @keyframes psRow{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .ps-select-option:hover,.ps-select-option:focus-visible{background:rgba(255,106,0,.09)!important;color:#ff6a00!important;outline:none}
  .ps-tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
  .ps-tbl-wrap::-webkit-scrollbar{height:6px}
  .ps-tbl-wrap::-webkit-scrollbar-track{background:rgba(255,255,255,.04)}
  .ps-tbl-wrap::-webkit-scrollbar-thumb{background:rgba(255,106,0,.45);border-radius:3px}
  .ps-tbl{border-collapse:collapse;width:max-content;min-width:100%;table-layout:fixed}
  .ps-tbl th,.ps-tbl td{border:1px solid rgba(255,255,255,.07)}
  .ps-tbl tbody tr{cursor:pointer}
  .ps-tbl tbody tr:hover td{filter:brightness(1.12)}
  .ps-outer{min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:40px 24px;background:${T.pageBg};font-family:${FB}}
  .ps-frame{width:430px;max-width:100%;background:${T.frame};border-radius:30px;overflow:hidden;box-shadow:0 30px 80px rgba(20,18,14,.32);border:1px solid rgba(0,0,0,.5)}
  .ps-outer:fullscreen{padding:0;align-items:stretch;background:${T.frame}}
  .ps-outer:fullscreen .ps-frame{width:100%;max-width:none;min-height:100vh;border-radius:0;border:none;box-shadow:none}
  @media (max-width:600px), (max-height:600px) and (orientation:landscape){
    .ps-outer{padding:0;background:${T.frame};align-items:stretch}
    .ps-frame{width:100%;max-width:100%;border-radius:0;border:none;box-shadow:none;min-height:100vh}
  }
  @media (prefers-reduced-motion:reduce){
    .ps-intro,.ps-intro-mark,.ps-intro-fill,.ps-intro-word{animation:none!important;transition-duration:.15s!important}
    .ps-intro-fill{clip-path:inset(0)}
  }`

/* ============ CÁLCULOS ============ */
function computeAtleta(a) {
  const sq = [
    a.valido_s1 === true ? (a.primer_intento_sentadilla || 0) : 0,
    a.valido_s2 === true ? (a.segundo_intento_sentadilla || 0) : 0,
    a.valido_s3 === true ? (a.tercer_intento_sentadilla || 0) : 0,
  ]
  const bp = [
    a.valido_b1 === true ? (a.primer_intento_banco || 0) : 0,
    a.valido_b2 === true ? (a.segundo_intento_banco || 0) : 0,
    a.valido_b3 === true ? (a.tercer_intento_banco || 0) : 0,
  ]
  const dl = [
    a.valido_d1 === true ? (a.primer_intento_peso_muerto || 0) : 0,
    a.valido_d2 === true ? (a.segundo_intento_peso_muerto || 0) : 0,
    a.valido_d3 === true ? (a.tercer_intento_peso_muerto || 0) : 0,
  ]
  const mejorSentadilla = Math.max(0, ...sq)
  const mejorBanco = Math.max(0, ...bp)
  const mejorPesoMuerto = Math.max(0, ...dl)
  const total = mejorSentadilla + mejorBanco + mejorPesoMuerto

  const completo =
    (a.valido_s1 === true || a.valido_s2 === true || a.valido_s3 === true) &&
    (a.valido_b1 === true || a.valido_b2 === true || a.valido_b3 === true) &&
    (a.valido_d1 === true || a.valido_d2 === true || a.valido_d3 === true)

  let dots = a.dots
  if (!dots && completo && total > 0 && a.peso_corporal > 0) {
    dots = parseFloat(Calculate_DOTS(a.peso_corporal, total, a.sexo === 'F'))
  }
  return { ...a, mejorSentadilla, mejorBanco, mejorPesoMuerto, total, dots, completo }
}

// Orden de las vistas en vivo (tanda y categoría): mayor peso levantado hasta
// el momento, o sea el total acumulado -suma de los mejores intentos válidos
// de cada movimiento-. A diferencia de DOTS, existe desde el primer tiro
// válido, así que el ranking se mueve durante toda la competencia.
// `lot` desempata para que el orden sea determinístico y no salte entre
// recargas cuando dos atletas van iguales en kilos.
const porTotal = (a, b) => {
  const dif = (b.total || 0) - (a.total || 0)
  if (dif !== 0) return dif
  return (Number(a.lot) || Number.POSITIVE_INFINITY) - (Number(b.lot) || Number.POSITIVE_INFINITY)
}

const fmtTimer = (s) => {
  const n = Math.max(0, parseInt(s) || 0)
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

/* ============ CELDA INTENTO ============ */
function Attempt({ status, label, big, joined = false }) {
  const base = {
    textAlign: 'center', fontFamily: FM, fontSize: big ? 16 : 13,
    borderRadius: joined ? 0 : (big ? 8 : 6), padding: big ? '10px 0' : '6px 0', position: 'relative',
  }
  if (status === 'ok') return <div style={{ ...base, fontWeight: 600, color: T.ok, background: T.okBg }}>{label}</div>
  if (status === 'fail') return <div style={{ ...base, color: T.fail, background: T.failBg, textDecoration: 'line-through' }}>{label}</div>
  if (status === 'current') return (
    <div style={{ ...base, fontWeight: 600, color: T.lime, background: 'rgba(255,106,0,.05)', border: '1px solid rgba(255,106,0,.5)' }}>
      {label}
      <span style={{ position: 'absolute', top: -3, right: -3, width: big ? 7 : 6, height: big ? 7 : 6, borderRadius: '50%', background: T.lime, animation: 'psDot 1.4s ease-in-out infinite' }} />
    </div>
  )
  if (status === 'pending') return <div style={{ ...base, color: T.txt2, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)' }}>{label}</div>
  return <div style={{ ...base, color: '#4b515c', background: 'rgba(255,255,255,.03)' }}>{label}</div>
}

/* ============ FOTO DE ATLETA ============ */
const FOTO_STYLE = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }

// `width`/`height` intrínsecos + decode asíncrono. `eager` solo para la foto
// del atleta en plataforma; el resto se difiere hasta entrar en viewport
// (el ranking completo puede ser una lista larga).
function Foto({ src, size, eager = false }) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      style={FOTO_STYLE}
    />
  )
}

/* ============ BARRITAS EN VIVO ============ */
function Eq({ color, h = 13, w = 3 }) {
  const bar = (d) => ({ width: w, height: '100%', background: color, borderRadius: 1, transformOrigin: 'bottom', animation: `psEq .9s ease-in-out infinite ${d}` })
  return (
    <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: h }}>
      <span style={bar('0s')} /><span style={bar('.3s')} /><span style={bar('.15s')} /><span style={bar('.45s')} />
    </span>
  )
}

/* ============ CARRUSEL ============ */
function Carousel({ children }) {
  const [idx, setIdx] = useState(0)
  const n = Children.count(children)
  const onScroll = (e) => {
    const el = e.currentTarget
    if (el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }
  return (
    <>
      <div className="ps-x" onScroll={onScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {Children.map(children, (c) => (
          <div style={{ flex: 'none', width: '100%', scrollSnapAlign: 'center', scrollSnapStop: 'always' }}>{c}</div>
        ))}
      </div>
      {n > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {Array.from({ length: n }).map((_, i) => (
            <span key={i} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? T.lime : 'rgba(255,255,255,.18)', transition: 'all .2s' }} />
          ))}
        </div>
      )}
    </>
  )
}

/* ============ ESTADO DE INTENTO ============ */
// `livePtr` son los 3 campos del estado que afectan a una celda: puntero al
// atleta/movimiento/intento en plataforma. Se pasa como objeto memoizado para
// que el tick del cronómetro (1 Hz) no invalide las filas memoizadas.
function attStatusOf(a, liftKey, prefix, i, livePtr) {
  const peso = a[`${ORD_WORD[i - 1]}_intento_${liftKey}`]
  const valido = a[`valido_${prefix}${i}`]
  let status = 'empty'
  if (valido === true) status = 'ok'
  else if (valido === false) status = 'fail'
  else if (peso) {
    const cur = livePtr.atletaId === a.id && livePtr.ejercicio === liftKey && livePtr.intento === i
    status = cur ? 'current' : 'pending'
  }
  return { status, label: peso ? String(peso) : '—' }
}

/* ============ TABLA DE INTENTOS (espejo de /intentos) ============ */
// Número de intento (1-3) que quedó como mejor válido del movimiento. Empate
// -> el primero, igual que la tabla de admin.
function mejorIntentoNum(a, L) {
  const best = a[L.best]
  if (!best) return 0
  for (const i of [1, 2, 3]) {
    if (a[`valido_${L.prefix}${i}`] === true && a[`${ORD_WORD[i - 1]}_intento_${L.key}`] === best) return i
  }
  return 0
}

// Mismos colores que columnsIntentos: válido -> verde (el mejor, más claro),
// nulo -> rojo tachado, sin juzgar/vacío -> gris.
function CeldaIntentoTabla({ atleta, lift, i }) {
  const peso = atleta[`${ORD_WORD[i - 1]}_intento_${lift.key}`]
  const valido = atleta[`valido_${lift.prefix}${i}`]
  const esMejor = mejorIntentoNum(atleta, lift) === i
  const juzgado = valido === true || valido === false
  const bg = valido === true ? (esMejor ? '#66bb6a' : '#2e7d32')
    : valido === false ? '#c62828'
    : 'rgba(128,128,128,.15)'
  return (
    <td style={{
      background: bg,
      color: juzgado ? '#fff' : T.txt2,
      fontFamily: FM, fontSize: 12, fontWeight: juzgado ? 700 : 400,
      textAlign: 'center', padding: '9px 4px',
      textDecoration: valido === false ? 'line-through' : 'none',
    }}>
      {peso || peso === 0 ? peso : '-'}
    </td>
  )
}

// Celdas de datos del atleta: fondo del color de su categoría, borde a borde,
// para que Lot/Atleta/Tanda/BW/Total se lean como un mismo bloque.
function CeldaCatTabla({ atleta, children, align = 'center', size = 12, weight = 600, font = FM }) {
  const bg = atleta.categoria ? colorCategoria(atleta.categoria) : 'transparent'
  return (
    <td style={{
      background: bg, color: atleta.categoria ? '#fff' : T.txt,
      fontFamily: font, fontSize: size, fontWeight: weight,
      textAlign: align, padding: '9px 8px', whiteSpace: 'nowrap',
    }}>
      {children}
    </td>
  )
}

const TABLA_HEAD = [
  ['Lot', 46], ['Atleta', 152], ['Tanda', 58], ['BW', 54], ['Peso', 104],
  ['S1', 54], ['S2', 54], ['S3', 54],
  ['B1', 54], ['B2', 54], ['B3', 54],
  ['D1', 54], ['D2', 54], ['D3', 54],
  ['Total', 66], ['Puesto', 64], ['GL', 62],
]

function palette(pos, isLive) {
  if (isLive) return { border: 'rgba(255,106,0,.4)', posBg: 'rgba(255,106,0,.12)', posColor: T.lime, posTag: 'LIVE' }
  if (pos === 1) return { border: 'rgba(255,106,0,.22)', posBg: 'rgba(255,106,0,.1)', posColor: T.lime, posTag: 'LÍDER' }
  return { border: 'rgba(255,255,255,.06)', posBg: 'rgba(255,255,255,.04)', posColor: '#e6e8ec', posTag: '' }
}

/* ============ TARJETA DE RANKING ============ */
// Memoizada: el cronómetro re-renderiza el componente raíz cada segundo y sin
// esto se reconciliaba el ranking entero (por atleta: 9 celdas de intento).
// Solo se re-renderiza si cambia su propio atleta o el puntero en vivo.
const RankingCard = memo(function RankingCard({ item, pos, livePtr, onOpen }) {
  const isLive = livePtr.atletaId === item.id
  const pal = palette(pos, isLive)
  return (
    <div onClick={() => onOpen(item)} style={{ background: T.card, border: `1px solid ${pal.border}`, borderRadius: 18, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0, padding: '13px 15px', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <div style={{ flex: 'none', width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', background: pal.posBg, border: `1px solid ${pal.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.foto ? (
              <Foto src={item.foto} size={46} />
            ) : (
              <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 16, color: pal.posColor }}>{(item.nombre?.[0] || '') + (item.apellido?.[0] || '')}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 21, color: '#f7f8fa', textTransform: 'uppercase', lineHeight: 1 }}>{item.nombre} {item.apellido}</span>
              {isLive && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.lime, borderRadius: 5, padding: '3px 6px' }}>
                  <Eq color="#fff" h={8} w={2} />
                  <span style={{ fontFamily: FM, fontSize: 8, letterSpacing: '.08em', fontWeight: 600, color: '#fff' }}>EN VIVO</span>
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: T.txt2, marginTop: 4 }}>{item.peso_corporal ?? '—'} kg · {item.edad ?? '—'} años · {item.modalidad ?? '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, padding: '4px 15px 0' }}>
        {LIFTS.map(L => (
          <div key={L.key} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.04em', color: T.txt3, textAlign: 'center', marginBottom: 6, textTransform: 'uppercase' }}>{L.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[1, 2, 3].map(i => { const s = attStatusOf(item, L.key, L.prefix, i, livePtr); return <Attempt key={i} status={s.status} label={s.label} /> })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
        <div style={{ flex: 1, padding: '13px 15px', background: 'rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.18em', color: T.txt3 }}>POS</div>
            <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .9, color: T.lime, marginTop: 2 }}><span style={{ fontSize: 30 }}>{pos || '—'}</span><span style={{ fontSize: 13, color: 'rgba(255,106,0,.6)', marginLeft: 1 }}>°</span></div>
          </div>
          <div style={{ flex: 'none', width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.12)' }} />
          <div>
            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.18em', color: T.txt3 }}>TOTAL</div>
            <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .9, color: '#f7f8fa', marginTop: 2 }}><span style={{ fontSize: 30 }}>{item.total || 0}</span><span style={{ fontSize: 13, color: T.txt2, marginLeft: 3 }}>kg</span></div>
          </div>
        </div>
        <div style={{ flex: 'none', padding: '13px 16px', textAlign: 'right', background: 'rgba(255,106,0,.08)' }}>
          <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.18em', color: T.txt3 }}>DOTS</div>
          <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 22, lineHeight: .9, color: T.lime, marginTop: 2 }}>{item.dots ? item.dots.toFixed(2) : '—'}</div>
        </div>
      </div>
    </div>
  )
})

/* ============ SELECT PROPIO POWERSPACE ============ */
function PowerSelect({ value, options, onChange, label, divider = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        minWidth: 0,
        borderLeft: divider ? `1px solid ${T.line}` : 0,
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{
          width: '100%', height: '100%', minHeight: 48,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '12px 15px', background: open ? 'rgba(255,106,0,.07)' : 'transparent',
          border: 0, outline: 0, color: open ? T.lime : '#e6e8ec',
          fontFamily: FB, fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'pointer',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected?.label || '—'}</span>
        <span
          aria-hidden="true"
          style={{
            flex: 'none', width: 8, height: 8,
            borderRight: `2px solid ${open ? T.lime : T.txt3}`,
            borderBottom: `2px solid ${open ? T.lime : T.txt3}`,
            transform: open ? 'rotate(225deg) translate(-2px,-2px)' : 'rotate(45deg) translate(-2px,-2px)',
            transition: 'transform .18s ease, border-color .18s ease',
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          style={{
            position: 'absolute', zIndex: 80, top: 'calc(100% + 7px)', left: 6, right: 6,
            maxHeight: 270, overflowY: 'auto', padding: 5,
            background: '#111318', border: '1px solid rgba(255,106,0,.35)',
            borderRadius: 12, boxShadow: '0 18px 42px rgba(0,0,0,.58)',
          }}
        >
          {options.map((option) => {
            const active = option.value === value
            return (
              <button
                type="button"
                role="option"
                aria-selected={active}
                className="ps-select-option"
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 11px', border: 0, borderRadius: 8,
                  background: active ? 'rgba(255,106,0,.14)' : 'transparent',
                  color: active ? T.lime : '#c9ced6',
                  fontFamily: FB, fontSize: 13, fontWeight: active ? 700 : 500,
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                <span>{option.label}</span>
                {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.lime, boxShadow: '0 0 10px rgba(255,106,0,.7)' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PublicoClient({ initialAtletas = [], initialEstado = null, initialAtletaEnVivo = null }) {
  const [introVisible, setIntroVisible] = useState(true)
  const [introLeaving, setIntroLeaving] = useState(false)
  const [atletas, setAtletas] = useState(() => initialAtletas.map(computeAtleta))
  const [sexoSel, setSexoSel] = useState('Masculino')
  const [catSel, setCatSel] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [tablaBusqueda, setTablaBusqueda] = useState('')
  const [tablaTanda, setTablaTanda] = useState('todas')
  const [tablaCat, setTablaCat] = useState('todas')
  const [atletaEnVivo, setAtletaEnVivo] = useState(initialAtletaEnVivo)
  const [estado, setEstado] = useState(initialEstado)
  const [ordenTanda, setOrdenTanda] = useState(null)
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [versusCat, setVersusCat] = useState(null)
  const [secs, setSecs] = useState(0)
  const [updating, setUpdating] = useState(false)
  const [exitHint, setExitHint] = useState(false)
  const loadedRef = useRef(false)
  const rankingRef = useRef(null)
  const preloadedRef = useRef(new Set())
  const navStackRef = useRef([])
  const viewStateRef = useRef({ view, selectedId, versusCat })
  const lastBackRef = useRef(0)
  const exitHintTimer = useRef(null)
  const publicScreenRef = useRef(null)
  // Espejo de `atletas` para decidir sincrónicamente si un patch por fila
  // aplica, sin leer estado dentro del updater de setState.
  const atletasRef = useRef(atletas)
  useEffect(() => { atletasRef.current = atletas }, [atletas])

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const salidaTimer = window.setTimeout(() => setIntroLeaving(true), reduceMotion ? 180 : 2200)
    const desmontarTimer = window.setTimeout(() => setIntroVisible(false), reduceMotion ? 350 : 2700)
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.clearTimeout(salidaTimer)
      window.clearTimeout(desmontarTimer)
      document.body.style.overflow = overflowAnterior
    }
  }, [])

  useEffect(() => {
    if (!introVisible) document.body.style.overflow = ''
  }, [introVisible])

  /* ---- carga + realtime: padrón y estado en vivo ----
     Un solo efecto para las dos cosas: un canal de postgres_changes, un canal
     de broadcast, un interval y un juego de listeners. Antes eran dos efectos
     con timers y listeners duplicados haciendo trabajo solapado.

     Todo en vivo: tiros válidos (intentos), posiciones (derivadas de
     atletas+intentos), altas/bajas/ediciones de atletas y cambios de
     equipo/coach. Los UPDATE de `intentos` -sobre lo que pasa en cada tiro-
     se aplican como patch de una fila; el resto de los eventos recarga el
     padrón completo porque cambia el conjunto de filas y un map por-atleta
     no alcanza. El debounce coalesce ráfagas (ej: upsert batch). */
  useEffect(() => {
    let alive = true
    let debounceTimer = null
    let reconcileTimer = null
    let updatingTimer = null
    let lastAtletaId = normalizarIdAtleta(initialEstado?.atleta_id)
    let lastEventAt = Date.now()
    let estadoRevision = 0
    let fetchEstadoSeq = 0
    let fetchAtletaSeq = 0

    const marcarEvento = () => { lastEventAt = Date.now() }

    const reload = async () => {
      setUpdating(true)
      try {
        const data = await fetchAtletasConIntentos({ tandaId: 'todas' })
        if (alive) setAtletas(data.map(computeAtleta))
      } catch (e) { console.error('Error al recargar padrón:', e) }
      finally {
        loadedRef.current = true
        clearTimeout(updatingTimer)
        if (alive) updatingTimer = setTimeout(() => alive && setUpdating(false), 400)
      }
    }

    const scheduleReload = (delay = 180) => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(reload, delay)
    }

    // Aplica un UPDATE de `intentos` sobre la fila del atleta. Devuelve false
    // si el atleta no está cargado todavía, y ahí el llamador recarga.
    const patchIntento = (row) => {
      if (!row) return false
      const lift = MOV_LIFT[row.movimiento_id]
      const prefix = MOV_PREFIX[row.movimiento_id]
      const ord = ORD_WORD[row.intento_numero - 1]
      if (!lift || !ord) return false
      const id = Number(row.atleta_id)
      if (!atletasRef.current.some(a => Number(a.id) === id)) return false
      setAtletas(prev => prev.map(a => (
        Number(a.id) === id
          ? computeAtleta({
              ...a,
              [`${ord}_intento_${lift}`]: row.peso,
              [`valido_${prefix}${row.intento_numero}`]: row.valido,
              // La view no trae `dots`: se deriva del total. Hay que limpiarlo
              // para que computeAtleta no conserve el de antes del tiro.
              dots: undefined,
            })
          : a
      )))
      return true
    }

    const fetchAtletaEnVivo = async (atletaId) => {
      const requestedId = normalizarIdAtleta(atletaId)
      const requestSeq = ++fetchAtletaSeq
      if (requestedId == null) {
        if (alive) setAtletaEnVivo(null)
        return
      }
      const { data, error } = await supabase.from('atletas').select('*').eq('id', requestedId).maybeSingle()
      // Una respuesta lenta de una selección anterior no puede reemplazar al
      // atleta que ya está en plataforma.
      if (!error && alive && requestSeq === fetchAtletaSeq && requestedId === lastAtletaId) {
        setAtletaEnVivo(data)
      }
    }

    const aplicarEstado = (incoming, completo = false) => {
      if (!incoming || !alive) return
      estadoRevision += 1
      setEstado(prev => completo ? incoming : { ...(prev || {}), ...incoming })
      if (Object.prototype.hasOwnProperty.call(incoming, 'atleta_id')) {
        const nextAtletaId = normalizarIdAtleta(incoming.atleta_id)
        if (nextAtletaId === lastAtletaId) return
        lastAtletaId = nextAtletaId
        // Invalida cualquier consulta iniciada para el atleta anterior.
        fetchAtletaSeq += 1
        // El padrón ya contiene la ficha completa en condiciones normales.
        // Aplicarla en el mismo render que el nuevo estado evita mezclar su
        // nombre con la foto del atleta anterior durante el fetch de respaldo.
        const atletaLocal = atletasRef.current.find(a => normalizarIdAtleta(a.id) === lastAtletaId)
        setAtletaEnVivo(atletaLocal || null)
        if (!atletaLocal) fetchAtletaEnVivo(lastAtletaId)
      }
    }

    const fetchEstado = async () => {
      const requestSeq = ++fetchEstadoSeq
      const revisionAlIniciar = estadoRevision
      // 1 round-trip: estado + atleta en vivo vía join embebido (FK estado_competencia.atleta_id -> atletas)
      const { data, error } = await supabase.from('estado_competencia').select('*, atleta:atletas(*)').eq('id', 1).maybeSingle()
      // Una consulta anterior, o iniciada antes de un evento realtime, nunca
      // puede pisar un estado más reciente.
      if (
        error || !data || !alive ||
        requestSeq !== fetchEstadoSeq || revisionAlIniciar !== estadoRevision
      ) return
      const { atleta, ...est } = data
      const nextAtletaId = normalizarIdAtleta(est.atleta_id)
      fetchAtletaSeq += 1
      setEstado(est)
      setAtletaEnVivo(nextAtletaId ? atleta : null)
      lastAtletaId = nextAtletaId
    }

    // Se suscribe antes de reconciliar para no dejar una ventana entre la
    // lectura y realtime. El debounce agrupa focus + visibilitychange.
    const reconcile = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(reconcileTimer)
      reconcileTimer = setTimeout(() => {
        fetchEstado()
        scheduleReload(0)
      }, 0)
    }

    const ch = supabase
      .channel('public:publico_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'intentos' }, (payload) => {
        marcarEvento()
        if (!patchIntento(payload.new)) scheduleReload()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'intentos' }, () => { marcarEvento(); scheduleReload() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'intentos' }, () => { marcarEvento(); scheduleReload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atletas' }, () => { marcarEvento(); scheduleReload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, () => { marcarEvento(); scheduleReload() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coaches' }, () => { marcarEvento(); scheduleReload() })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' },
        (payload) => { marcarEvento(); aplicarEstado(payload.new, true) }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') { marcarEvento(); reconcile() }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime público no disponible:', error || status)
          reconcile()
        }
      })

    // Fast-path compartido con cargadores y referees.
    const live = joinCompetenciaLive(
      (parcial) => { marcarEvento(); aplicarEstado(parcial, false) },
      () => { marcarEvento(); scheduleReload(80) },
      null,
      (orden) => {
        if (!Number.isInteger(orden?.tandaId) || !Array.isArray(orden?.atletaIds)) return
        setOrdenTanda(orden)
        setTablaTanda(String(orden.tandaId))
      }
    )

    // Forzado: se viene de un gap real (pestaña dormida, red caída). No marca
    // evento a propósito: `lastEventAt` mide solo tráfico de realtime, así que
    // con el socket caído el polling sigue firme cada 10s.
    // Periódico: solo si el realtime quedó callado. Con el socket sano no
    // dispara, en vez de refetchear el padrón entero cada 10s por espectador.
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastEventAt < REALTIME_STALE_MS) return
      reconcile()
    }, 10000)
    window.addEventListener('focus', reconcile)
    window.addEventListener('online', reconcile)
    document.addEventListener('visibilitychange', reconcile)

    return () => {
      alive = false
      clearTimeout(debounceTimer)
      clearTimeout(reconcileTimer)
      clearTimeout(updatingTimer)
      clearInterval(interval)
      window.removeEventListener('focus', reconcile)
      window.removeEventListener('online', reconcile)
      document.removeEventListener('visibilitychange', reconcile)
      supabase.removeChannel(ch)
      live.leave()
    }
  }, [])

  /* ---- cronómetro local ---- */
  useEffect(() => {
    if (!estado) return
    setSecs(estado.tiempo_restante ?? 0)
    if (!estado.corriendo) return
    const t = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [estado?.tiempo_restante, estado?.corriendo])

  /* ---- puntero en vivo (atleta/movimiento/intento en plataforma) ----
     Se aísla de `estado` para que las tarjetas memoizadas no se invaliden con
     el tick del cronómetro ni con las luces de los referees. */
  const livePtr = useMemo(() => ({
    atletaId: estado?.atleta_id ?? null,
    ejercicio: estado?.ejercicio ?? null,
    intento: estado?.intento ?? null,
  }), [estado?.atleta_id, estado?.ejercicio, estado?.intento])

  // Descalificados quedan fuera de todo ranking/premiación (no cuentan ni
  // ocupan puesto), pero se mantienen en `atletas` para búsqueda/detalle.
  const atletasVigentes = useMemo(() => atletas.filter(a => !a.descalificado), [atletas])
  const atletasPorId = useMemo(() => new Map(
    atletas.map(a => [normalizarIdAtleta(a.id), a])
  ), [atletas])

  /* ---- posición por categoría (sobre todo el padrón) ---- */
  const posMap = useMemo(() => {
    const groups = {}
    atletasVigentes.forEach(a => {
      clavesCategoriasAtleta(a).forEach((clave) => { (groups[clave] ??= []).push(a) })
    })
    const m = {}
    Object.values(groups).forEach(list => {
      list.sort((x, y) => (y.dots || 0) - (x.dots || 0)).forEach((a, i) => {
        m[a.id] = Math.min(m[a.id] ?? Number.POSITIVE_INFINITY, i + 1)
      })
    })
    return m
  }, [atletasVigentes])

  const puestoProvisorioMap = useMemo(() => {
    const groups = {}
    atletasVigentes.forEach((atleta) => {
      clavesCategoriasAtleta(atleta).forEach((clave) => { (groups[clave] ??= []).push(atleta) })
    })
    const puestos = {}
    Object.values(groups).forEach((lista) => {
      lista.sort(porTotal).forEach((atleta, index) => {
        puestos[atleta.id] = Math.min(puestos[atleta.id] ?? Number.POSITIVE_INFINITY, index + 1)
      })
    })
    return puestos
  }, [atletasVigentes])

  // Simula solamente el próximo intento de cada atleta como válido. Los demás
  // competidores conservan sus totales reales: indica el puesto al que llegaría
  // si ese levantamiento entrara ahora, sin alterar ningún dato de competencia.
  const puestoSiValidoMap = useMemo(() => {
    const intento = Number(estado?.intento)
    const ejercicio = estado?.ejercicio
    const campoPeso = ejercicio && [1, 2, 3].includes(intento)
      ? `${ORD_WORD[intento - 1]}_intento_${ejercicio}`
      : null
    const bestKey = LIFTS.find((lift) => lift.key === ejercicio)?.best
    if (!campoPeso || !bestKey) return puestoProvisorioMap

    const groups = {}
    atletasVigentes.forEach((atleta) => {
      clavesCategoriasAtleta(atleta).forEach((clave) => { (groups[clave] ??= []).push(atleta) })
    })
    const puestos = { ...puestoProvisorioMap }

    Object.values(groups).forEach((lista) => {
      lista.forEach((atleta) => {
        const pesoATirar = Number(atleta[campoPeso]) || 0
        if (pesoATirar <= 0) return
        const totalProyectado = (atleta.total || 0) - (atleta[bestKey] || 0) + Math.max(atleta[bestKey] || 0, pesoATirar)
        const ranking = lista
          .map((competidor) => ({
            id: competidor.id,
            total: competidor.id === atleta.id ? totalProyectado : (competidor.total || 0),
            lot: Number(competidor.lot) || Number.POSITIVE_INFINITY,
          }))
          .sort((a, b) => b.total - a.total || a.lot - b.lot)
        const puesto = ranking.findIndex((competidor) => competidor.id === atleta.id) + 1
        puestos[atleta.id] = Math.min(puestos[atleta.id] ?? Number.POSITIVE_INFINITY, puesto)
      })
    })
    return puestos
  }, [atletasVigentes, estado?.ejercicio, estado?.intento, puestoProvisorioMap])

  /* ---- tabla de intentos (todos los atletas) ----
     Espejo de /intentos: GL points y puesto por GL dentro de cada categoría.
     El orden de filas es el de la view (tanda -> apertura -> lot), igual que
     en admin. Los descalificados se listan pero no ocupan puesto. */
  const tablaAtletas = useMemo(() => {
    const conGl = atletas.map((a) => {
      let ipf_gl = null
      if (a.completo && a.total > 0 && a.peso_corporal > 0) {
        const equipado = String(a.modalidad || '').toLowerCase().includes('equip')
        ipf_gl = parseFloat(Calculate_IPF_GL(a.peso_corporal, a.total, a.sexo === 'F', equipado).toFixed(2))
      }
      return { ...a, ipf_gl }
    })

    const grupos = {}
    conGl.forEach((a) => {
      if (a.descalificado) return
      clavesCategoriasAtleta(a).forEach((clave) => { (grupos[clave] ??= []).push(a) })
    })
    const mejorPuesto = new Map()
    Object.values(grupos).forEach((lista) => {
      lista
        .filter((a) => a.ipf_gl > 0)
        .sort((x, y) => y.ipf_gl - x.ipf_gl)
        .forEach((a, i) => {
          mejorPuesto.set(a.id, Math.min(mejorPuesto.get(a.id) ?? Number.POSITIVE_INFINITY, i + 1))
        })
    })

    return conGl.map((a) => ({ ...a, puesto: a.descalificado ? null : (mejorPuesto.get(a.id) ?? null) }))
  }, [atletas])

  const tandasDisponibles = useMemo(() => (
    [...new Set(atletas.map((a) => a.tanda_id).filter((t) => t != null))].sort((a, b) => a - b)
  ), [atletas])

  const categoriasTabla = useMemo(() => (
    [...new Set(atletas.map((a) => a.categoria).filter(Boolean))].sort()
  ), [atletas])

  const tablaFiltrada = useMemo(() => {
    let r = tablaAtletas
    if (tablaTanda !== 'todas') r = r.filter((a) => String(a.tanda_id) === String(tablaTanda))
    if (tablaCat !== 'todas') r = r.filter((a) => String(a.categoria) === String(tablaCat))
    const q = tablaBusqueda.trim().toLowerCase()
    if (q) r = r.filter((a) => `${a.nombre ?? ''} ${a.apellido ?? ''}`.toLowerCase().includes(q))

    const contextoAplica = ordenTanda && Number(tablaTanda) === Number(ordenTanda.tandaId)
    if (contextoAplica) {
      const posicionPorAtleta = new Map(ordenTanda.atletaIds.map((id, index) => [Number(id), index]))
      r = [...r].sort((a, b) => {
        const posicionA = posicionPorAtleta.get(Number(a.id))
        const posicionB = posicionPorAtleta.get(Number(b.id))
        if (posicionA != null && posicionB != null) return posicionA - posicionB
        if (posicionA != null) return -1
        if (posicionB != null) return 1
        return Number(a.lot ?? Infinity) - Number(b.lot ?? Infinity)
      })
    }

    return r
  }, [tablaAtletas, tablaTanda, tablaCat, tablaBusqueda, ordenTanda])

  /* ---- filtrado ---- */
  const filtrados = useMemo(() => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      return atletasVigentes.filter(a =>
        `${a.nombre ?? ''} ${a.apellido ?? ''}`.toLowerCase().includes(q))
    }
    const sx = sexoSel === 'Masculino' ? 'M' : 'F'
    let r = atletasVigentes.filter(a => a.sexo === sx)
    if (catSel !== 'todas') r = r.filter(a => a.categoria === catSel)
    return r
  }, [atletasVigentes, busqueda, sexoSel, catSel])

  /* ---- agrupado por categoría (ordenado) ---- */
  const grupos = useMemo(() => {
    const g = {}
    filtrados.forEach(a => {
      clavesCategoriasAtleta(a).forEach((clave) => { (g[clave] ??= []).push(a) })
    })
    const getPeso = (cat) => {
      const m = cat?.match(/\+?(\d+)kg/)
      if (!m) return 0
      return cat.includes('+') ? parseInt(m[1]) + 0.5 : parseInt(m[1])
    }
    return Object.entries(g)
      .map(([cat, list]) => [cat, list.sort((x, y) => (y.dots || 0) - (x.dots || 0))])
      .sort(([a], [b]) => {
        const ordenEdad = ['Sub-Junior', 'Junior', 'Open', 'Master I', 'Master II', 'Master III', 'Master IV']
        const edadA = ordenEdad.findIndex(edad => a.startsWith(edad))
        const edadB = ordenEdad.findIndex(edad => b.startsWith(edad))
        if (edadA !== edadB) return edadA - edadB
        const am = a.includes('M - '), bm = b.includes('M - ')
        if (am && !bm) return -1
        if (!am && bm) return 1
        return getPeso(a) - getPeso(b)
      })
  }, [filtrados])

  /* ---- próximos ---- */
  const proximos = useMemo(() => {
    if (!atletaEnVivo || !estado) return []
    if (Array.isArray(estado.orden_proximos)) {
      return estado.orden_proximos
        .map(id => atletasPorId.get(normalizarIdAtleta(id)))
        .filter(Boolean)
    }
    const mismaTanda = atletas.filter(a => a.tanda_id === atletaEnVivo.tanda_id)
    const atletaEnVivoId = normalizarIdAtleta(atletaEnVivo.id)
    const i = mismaTanda.findIndex(a => normalizarIdAtleta(a.id) === atletaEnVivoId)
    return i === -1 ? [] : mismaTanda.slice(i + 1)
  }, [atletaEnVivo, estado, atletas, atletasPorId])

  /* ---- precarga de fotos: en vivo -> próximos -> resto (perfil abre instantáneo) ---- */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = preloadedRef.current
    const prime = (url) => {
      if (!url || seen.has(url)) return
      seen.add(url)
      const im = new Image()
      im.decoding = 'async'
      im.src = url
    }
    prime(atletaEnVivo?.foto)
    proximos.forEach(a => prime(a.foto))
    const rest = () => atletas.forEach(a => prime(a.foto))
    const ric = window.requestIdleCallback
    if (ric) { const id = ric(rest, { timeout: 2000 }); return () => window.cancelIdleCallback?.(id) }
    const t = setTimeout(rest, 600)
    return () => clearTimeout(t)
  }, [atletas, atletaEnVivo, proximos])

  /* ---- derivados live ---- */
  const liveA = useMemo(() => {
    if (!atletaEnVivo) return null
    return atletasPorId.get(normalizarIdAtleta(atletaEnVivo.id)) || computeAtleta(atletaEnVivo)
  }, [atletaEnVivo, atletasPorId])

  const live = useMemo(() => {
    if (!liveA || !estado) return null
    const liftKey = estado.ejercicio
    const bestKey = LIFTS.find(l => l.key === liftKey)?.best
    const subtotal = liveA.total || 0
    const bestCur = bestKey ? (liveA[bestKey] || 0) : 0
    const proj = subtotal + Math.max(0, (estado.peso || 0) - bestCur)
    return {
      name: `${liveA.nombre ?? ''} ${liveA.apellido ?? ''}`.trim(),
      cat: [claveCategoriaAtleta(liveA), liveA.modalidad].filter(Boolean).join(' · '),
      bw: liveA.peso_corporal, age: liveA.edad,
      lift: LIFT_LABEL[liftKey] || '—',
      attemptLabel: estado.intento ? `${estado.intento}º intento` : '',
      weight: estado.peso ?? '—',
      subtotal, proj, pos: posMap[liveA.id] || '—',
    }
  }, [liveA, estado, posMap])

  /* ---- detalle ---- */
  const selected = useMemo(
    () => atletasPorId.get(normalizarIdAtleta(selectedId)) || null,
    [atletasPorId, selectedId]
  )

  /* ---- lista versus (categoría en vivo) + reordenamiento FLIP ---- */
  const versusList = useMemo(() => {
    if (!versusCat) return []
    return atletasVigentes
      .filter(a => clavesCategoriasAtleta(a).includes(versusCat))
      .sort(porTotal)
  }, [atletasVigentes, versusCat])

  /* ---- tanda que se está disputando: orden de plataforma estable ---- */
  const tandaActual = liveA?.tanda_id ?? atletaEnVivo?.tanda_id ?? null
  const tandaList = useMemo(() => {
    if (tandaActual == null) return []
    const atletasTanda = atletasVigentes
      .filter((atleta) => String(atleta.tanda_id) === String(tandaActual))
    if (!ordenTanda || Number(ordenTanda.tandaId) !== Number(tandaActual)) return atletasTanda

    const posicionPorAtleta = new Map(ordenTanda.atletaIds.map((id, index) => [Number(id), index]))
    return [...atletasTanda].sort((a, b) => {
      const posicionA = posicionPorAtleta.get(Number(a.id))
      const posicionB = posicionPorAtleta.get(Number(b.id))
      if (posicionA != null && posicionB != null) return posicionA - posicionB
      if (posicionA != null) return -1
      if (posicionB != null) return 1
      return 0
    })
  }, [atletasVigentes, tandaActual, ordenTanda])

  const rowRefs = useRef({})
  const prevTops = useRef({})
  useLayoutEffect(() => {
    if (view !== 'versus' && view !== 'tanda') { prevTops.current = {}; return }
    const listaActiva = view === 'tanda' ? tandaList : versusList
    const next = {}
    listaActiva.forEach(a => { const el = rowRefs.current[a.id]; if (el) next[a.id] = el.offsetTop })
    listaActiva.forEach(a => {
      const el = rowRefs.current[a.id]
      if (!el) return
      const prev = prevTops.current[a.id]
      if (prev != null && next[a.id] != null && prev !== next[a.id]) {
        el.style.transition = 'none'
        el.style.transform = `translateY(${prev - next[a.id]}px)`
        void el.offsetHeight
        requestAnimationFrame(() => {
          el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)'
          el.style.transform = ''
        })
      }
    })
    prevTops.current = next
  }, [versusList, tandaList, view])

  /* ---- navegación interna + gesto "atrás" ----
     atrás vuelve de vista (detalle/versus -> inicio) en vez de cerrar la página;
     en el inicio hace falta tocar atrás dos veces para salir ---- */
  useEffect(() => { viewStateRef.current = { view, selectedId, versusCat } }, [view, selectedId, versusCat])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const pushGuard = () => window.history.pushState({ ...(window.history.state || {}), psGuard: true }, '')
    // entrada "guardia": captura el primer atrás estando en el inicio
    if (!window.history.state?.psGuard) pushGuard()
    const onPop = () => {
      const stack = navStackRef.current
      if (stack.length > 0) {                       // hay vista anterior -> volver
        const prev = stack.pop()
        setView(prev.view); setSelectedId(prev.selectedId); setVersusCat(prev.versusCat)
        window.scrollTo({ top: 0 })
        return
      }
      // estamos en el inicio: requiere doble atrás para salir
      const now = Date.now()
      if (now - lastBackRef.current < 2000) { window.history.back(); return } // segundo atrás -> sale
      lastBackRef.current = now
      pushGuard()                                   // traga este atrás y queda en la página
      setExitHint(true)
      window.clearTimeout(exitHintTimer.current)
      exitHintTimer.current = window.setTimeout(() => setExitHint(false), 2000)
    }
    window.addEventListener('popstate', onPop)
    return () => { window.removeEventListener('popstate', onPop); window.clearTimeout(exitHintTimer.current) }
  }, [])

  // Estables (solo tocan refs y setters de estado): así `onOpen` no invalida
  // las tarjetas memoizadas en cada render.
  const pushNav = useCallback((next) => {
    navStackRef.current.push({ ...viewStateRef.current })
    if (typeof window !== 'undefined') window.history.pushState({ ...(window.history.state || {}), psGuard: true }, '')
    setView(next.view)
    if ('selectedId' in next) setSelectedId(next.selectedId)
    if ('versusCat' in next) setVersusCat(next.versusCat)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [])

  const openDetail = useCallback((a) => pushNav({ view: 'detail', selectedId: a.id }), [pushNav])
  const back = () => { if (typeof window !== 'undefined') window.history.back() }
  const verCategoria = (cat) => {
    const c = cat || clavesCategoriasAtleta(atletaEnVivo)[0]
    if (!c) return
    pushNav({ view: 'versus', versusCat: c })
  }
  const verTandaActual = () => {
    if (tandaActual == null) return
    pushNav({ view: 'tanda' })
  }
  const verTablaIntentos = () => pushNav({ view: 'tabla' })
  const activarPantallaCompleta = () => {
    if (!document.fullscreenElement) {
      publicScreenRef.current?.requestFullscreen?.().catch((error) => {
        console.error('No se pudo activar la pantalla completa:', error)
      })
    }
  }

  /* ---- estado de intento ---- */
  const attStatus = (a, liftKey, prefix, i) => attStatusOf(a, liftKey, prefix, i, livePtr)

  const catsDisponibles = sexoSel === 'Masculino' ? categorias.M : categorias.F
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  return (
    <div ref={publicScreenRef} className="ps-outer">
      <style>{PS_CSS}</style>

      {introVisible && (
        <div
          className={`ps-intro${introLeaving ? ' ps-intro--leaving' : ''}`}
          role="status"
          aria-label="Cargando Gymspace"
        >
          <div className="ps-intro-lockup">
            <div className="ps-intro-mark">
              <img className="ps-intro-ghost" src="/Gymspace-logo.png" alt="" width={210} height={210} />
              <img className="ps-intro-fill" src="/Gymspace-logo.png" alt="Gymspace" width={210} height={210} fetchPriority="high" />
            </div>
            <div className="ps-intro-word">POWERSPACE</div>
          </div>
        </div>
      )}

      {updating && <div className="ps-bar" />}

      {exitHint && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 120, background: 'rgba(8,9,11,.92)', border: `1px solid ${T.line2}`, color: T.txt, fontFamily: FB, fontSize: 13, padding: '10px 18px', borderRadius: 999, backdropFilter: 'blur(8px)', boxShadow: '0 8px 30px rgba(0,0,0,.4)' }}>
          Tocá atrás de nuevo para salir
        </div>
      )}

      <div className="ps-frame">

        {/* ============ HEADER ============ */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(14px)', background: 'rgba(8,9,11,.82)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/Gymspace-logo.png" alt="GYMSPACE" width={34} height={34} decoding="async" style={{ height: 34, width: 34, borderRadius: 8, objectFit: 'contain', flex: 'none' }} />
              <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 21, letterSpacing: '.02em', color: T.txt, position: 'relative', paddingBottom: 5 }}>
                POWERSPACE<span style={{ position: 'absolute', left: 0, bottom: 0, width: 38, height: 4, background: T.lime }} />
              </div>
            </div>
            <div
              role={atletaEnVivo ? 'button' : undefined}
              tabIndex={atletaEnVivo ? 0 : undefined}
              onClick={atletaEnVivo ? activarPantallaCompleta : undefined}
              onKeyDown={atletaEnVivo ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') activarPantallaCompleta()
              } : undefined}
              title={atletaEnVivo ? 'Abrir pantalla completa' : undefined}
              style={{ textAlign: 'right', cursor: atletaEnVivo ? 'pointer' : 'default' }}
            >
              <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.12em', color: '#fff' }}>{atletaEnVivo ? 'EN VIVO' : 'RANKING'}</div>
              <div style={{ fontFamily: FM, fontSize: 10, color: T.txt3, marginTop: 2 }}>{hoy}</div>
            </div>
          </div>
        </div>

        {/* ============ VISTA LISTA ============ */}
        {view === 'list' && (
          <div className="ps-view" style={{ padding: '18px 16px 90px' }}>

            {/* ---- LIVE ---- */}
            {live && (
              <>
              <div onClick={() => openDetail(liveA)} style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: T.card, border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: T.lime }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Eq color="#fff" />
                    <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.18em', color: '#fff' }}>EN VIVO</span>
                  </div>
                  <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 600, color: '#fff' }}>{fmtTimer(secs)}</span>
                </div>

                <div style={{ padding: '18px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <div style={{ flex: 'none', width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,106,0,.12)', border: '2px solid rgba(255,106,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {liveA?.foto ? (
                        <Foto src={liveA.foto} size={72} eager />
                      ) : (
                        <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 26, color: T.lime }}>{(liveA?.nombre?.[0] || '') + (liveA?.apellido?.[0] || '')}</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.12em', color: T.txt3 }}>PLATAFORMA</div>
                      <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 32, lineHeight: .95, color: '#f7f8fa', textTransform: 'uppercase', letterSpacing: '.01em', marginTop: 5 }}>{live.name}</div>
                      <div style={{ fontSize: 13, color: T.txt2, marginTop: 6 }}>{live.cat}</div>
                      <div style={{ fontFamily: FM, fontSize: 11, color: T.txt3, marginTop: 4 }}>{live.bw ?? '—'} kg BW · {live.age ?? '—'} años</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginTop: 16 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 13, padding: '13px 15px' }}>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.14em', color: T.txt3, marginBottom: 6 }}>MOVIMIENTO</div>
                      <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 19, color: T.txt, textTransform: 'uppercase' }}>{live.lift}</div>
                      <div style={{ fontSize: 12, color: T.lime, marginTop: 2 }}>{live.attemptLabel}</div>
                    </div>
                    <div style={{ flex: 'none', width: 130, background: T.lime, borderRadius: 13, padding: '13px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.14em', color: 'rgba(255,255,255,.75)', marginBottom: 2 }}>EN JUEGO</div>
                      <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .85, color: '#fff' }}>
                        <span style={{ fontSize: String(live.weight).length >= 5 ? 30 : String(live.weight).length >= 4 ? 36 : 44 }}>{live.weight}</span><span style={{ fontSize: 15, marginLeft: 2 }}>kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, background: T.card, border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={verTandaActual}
                  style={{ width: '100%', display: 'block', textAlign: 'center', background: 'rgba(255,106,0,.09)', border: 0, padding: '12px 8px', fontFamily: FO, fontWeight: 700, fontSize: 12, letterSpacing: '.05em', color: T.lime, cursor: 'pointer' }}
                >
                  TANDA {letraTanda(tandaActual)} EN VIVO
                </button>
              </div>
              </>
            )}

            {/* ---- PRÓXIMOS ---- */}
            {proximos.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.2em', color: T.txt2 }}>PRÓXIMOS</span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
                </div>
                <div className="ps-x" style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 2 }}>
                  {proximos.map((np, i) => (
                    <div key={np.id} onClick={() => openDetail(np)} style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, padding: '10px 14px 10px 11px', cursor: 'pointer' }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: T.lime, color: '#fff', fontFamily: FO, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      <span style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {np.foto ? (
                          <Foto src={np.foto} size={30} />
                        ) : (
                          <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 11, color: T.txt2 }}>{(np.nombre?.[0] || '') + (np.apellido?.[0] || '')}</span>
                        )}
                      </span>
                      <span>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#e6e8ec', lineHeight: 1.1 }}>{np.nombre} {np.apellido}</span>
                        <span style={{ display: 'block', fontFamily: FM, fontSize: 10, color: T.txt3 }}>{claveCategoriaAtleta(np)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- BUSCADOR + FILTROS ---- */}
            <div style={{ marginTop: 24, background: T.card, border: `1px solid ${T.line}`, borderRadius: 15, position: 'relative', zIndex: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 15px' }}>
                <span style={{ width: 15, height: 15, border: '1.7px solid #6b7280', borderRadius: '50%', position: 'relative', flex: 'none' }}>
                  <span style={{ position: 'absolute', width: 6, height: '1.7px', background: '#6b7280', transform: 'rotate(45deg)', bottom: -2, right: -4 }} />
                </span>
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar atleta…"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: FB, fontSize: 14, color: '#e6e8ec' }} />
              </div>
              {!busqueda.trim() && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${T.line}` }}>
                  <PowerSelect
                    label="Sexo"
                    value={sexoSel}
                    options={[
                      { value: 'Masculino', label: 'Masculino' },
                      { value: 'Femenino', label: 'Femenino' },
                    ]}
                    onChange={(nextSexo) => {
                      setSexoSel(nextSexo)
                      setCatSel('todas')
                    }}
                  />
                  <PowerSelect
                    divider
                    label="Categoría de peso"
                    value={catSel}
                    options={[
                      { value: 'todas', label: 'Todas' },
                      ...catsDisponibles.map((categoria) => ({ value: categoria, label: categoria })),
                    ]}
                    onChange={setCatSel}
                  />
                </div>
              )}
            </div>

            {/* ---- ACCESO A LA TABLA DE INTENTOS ---- */}
            <button
              type="button"
              onClick={verTablaIntentos}
              style={{
                width: '100%', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: '13px 15px', background: 'rgba(255,106,0,.09)',
                border: '1px solid rgba(255,106,0,.3)', borderRadius: 13, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: FO, fontWeight: 700, fontSize: 14, letterSpacing: '.06em', color: T.lime }}>
                  TABLA DE INTENTOS
                </span>
                <span style={{ display: 'block', fontFamily: FM, fontSize: 10, color: T.txt3, marginTop: 3 }}>
                  Todos los atletas · todos los intentos
                </span>
              </span>
              <span
                aria-hidden="true"
                style={{ flex: 'none', width: 8, height: 8, borderTop: `2px solid ${T.lime}`, borderRight: `2px solid ${T.lime}`, transform: 'rotate(45deg)' }}
              />
            </button>

            {/* ---- RANKING POR CATEGORÍA ---- */}
            <div ref={rankingRef} />
            {grupos.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 60, fontFamily: FM, fontSize: 12, letterSpacing: '.1em', color: T.txt4 }}>
                {loadedRef.current ? 'SIN ATLETAS PARA MOSTRAR' : 'CARGANDO…'}
              </div>
            ) : grupos.map(([cat, list]) => (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '26px 0 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 4, height: 19, background: T.lime, borderRadius: 2 }} />
                    <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 17, letterSpacing: '.06em', color: T.txt }}>{cat?.toUpperCase()}</span>
                  </div>
                  <span style={{ fontFamily: FM, fontSize: 10, color: T.txt3 }}>{list.length} atletas · provisional</span>
                </div>

                <Carousel>
                  {list.map((item) => (
                    <RankingCard
                      key={item.id}
                      item={item}
                      pos={posMap[item.id] || 0}
                      livePtr={livePtr}
                      onOpen={openDetail}
                    />
                  ))}
                </Carousel>
              </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: 22, fontFamily: FM, fontSize: 10, letterSpacing: '.16em', color: T.txt4 }}>POWERSPACE</div>
          </div>
        )}

        {/* ============ VISTA DETALLE ============ */}
        {view === 'detail' && selected && (() => {
          const isLive = estado?.atleta_id === selected.id
          const pos = posMap[selected.id] || 0
          const posTagLong = isLive ? 'EN PLATAFORMA' : pos === 1 ? 'LÍDER DE CATEGORÍA' : 'CLASIFICACIÓN PROVISIONAL'
          const categoriasSeleccionadas = selected.categoria ? clavesCategoriasAtleta(selected) : []
          const facts = [
            { k: 'PESO CORPORAL', v: `${selected.peso_corporal ?? '—'} kg` },
            { k: 'EDAD', v: `${selected.edad ?? '—'} años` },
            { k: 'DIVISIÓN', v: selected.modalidad ?? '—' },
            { k: 'CATEGORÍA', v: claveCategoriaAtleta(selected) },
          ]
          return (
            <div className="ps-view" style={{ paddingBottom: 90 }}>
              {/* HERO */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#0c0e12', overflow: 'hidden' }}>
                {selected.foto ? (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${selected.foto})`, backgroundSize: 'cover', backgroundPosition: 'center top', animation: 'psHero .6s ease both' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,#1c2027,#1c2027 9px,#191d23 9px,#191d23 18px)' }} />
                )}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: -5, background: 'linear-gradient(180deg,rgba(8,9,11,0) 0%,rgba(8,9,11,0) 75%,rgba(8,9,11,.6) 90%,#08090b 100%)' }} />
                <div onClick={back} style={{ position: 'absolute', top: 16, left: 16, width: 42, height: 42, borderRadius: 13, background: 'rgba(8,9,11,.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <CaretLeft size={24} weight="bold" color={T.txt} />
                </div>
                {isLive && (
                  <div style={{ position: 'absolute', top: 18, right: 16, display: 'flex', alignItems: 'center', gap: 6, background: T.lime, borderRadius: 7, padding: '5px 9px' }}>
                    <Eq color="#fff" h={10} w={2.5} />
                    <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 11, letterSpacing: '.14em', color: '#fff' }}>EN VIVO</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '18px 16px', marginTop: -80, position: 'relative', zIndex: 1 }}>
                {/* TÍTULO + DATOS (superpuesto sobre la foto) */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 13, color: '#fff', background: T.lime, borderRadius: 6, padding: '2px 9px' }}>{pos || '—'}º</span>
                    <span style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.12em', color: T.txt2 }}>{posTagLong}</span>
                  </div>
                  <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 42, lineHeight: .92, color: '#f7f8fa', textTransform: 'uppercase', letterSpacing: '.01em' }}>{selected.nombre} {selected.apellido}</div>
                  <div style={{ fontSize: 13, color: T.txt2, marginTop: 7 }}>{claveCategoriaAtleta(selected)} · {selected.peso_corporal ?? '—'} kg BW · {selected.edad ?? '—'} años</div>
                </div>

                {/* STATS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ minWidth: 0, padding: '14px 15px' }}>
                    <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.16em', color: T.txt3 }}>TOTAL</div>
                    <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .9, color: '#f7f8fa', marginTop: 4 }}><span style={{ fontSize: 32 }}>{selected.total || 0}</span><span style={{ fontSize: 13, color: T.txt2, marginLeft: 3 }}>kg</span></div>
                  </div>
                  <div style={{ minWidth: 0, borderLeft: '1px solid rgba(255,106,0,.25)', background: 'rgba(255,106,0,.04)', padding: '14px 15px' }}>
                    <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.16em', color: T.txt3 }}>DOTS</div>
                    <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 32, lineHeight: .9, color: T.lime, marginTop: 4 }}>{selected.dots ? selected.dots.toFixed(2) : '—'}</div>
                  </div>
                </div>

                {/* ACCESOS EN VIVO */}
                {(categoriasSeleccionadas.length > 0 || tandaActual != null) && (
                  <div style={{ marginTop: 10, background: T.card, border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' }}>
                    {categoriasSeleccionadas.map((categoriaCompleta, index) => (
                      <button
                        type="button"
                        key={categoriaCompleta}
                        onClick={() => verCategoria(categoriaCompleta)}
                        style={{ width: '100%', display: 'block', textAlign: 'center', background: 'rgba(255,255,255,.025)', border: 0, borderTop: index > 0 ? '1px solid rgba(255,255,255,.08)' : 0, padding: 12, fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.06em', color: '#c9ced6', cursor: 'pointer' }}
                      >
                        {(selected.nombre || '').toUpperCase()} VS {categoriaCompleta.toUpperCase()}
                      </button>
                    ))}
                    {tandaActual != null && (
                      <button
                        type="button"
                        onClick={verTandaActual}
                        style={{ width: '100%', display: 'block', textAlign: 'center', background: 'rgba(255,106,0,.09)', border: 0, borderTop: '1px solid rgba(255,106,0,.3)', padding: 12, fontFamily: FO, fontWeight: 700, fontSize: 13, letterSpacing: '.08em', color: T.lime, cursor: 'pointer' }}
                      >
                        VER TANDA {letraTanda(tandaActual)} EN VIVO
                      </button>
                    )}
                  </div>
                )}

                {/* LEVANTANDO AHORA */}
                {isLive && live && (
                  <div style={{ marginTop: 14, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,106,0,.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', background: 'rgba(255,106,0,.12)' }}>
                      <Eq color={T.lime} h={11} w={2.5} />
                      <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 12, letterSpacing: '.14em', color: T.lime }}>LEVANTANDO AHORA</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 15px', background: T.card }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 18, color: T.txt, textTransform: 'uppercase' }}>{live.lift}</div>
                        <div style={{ fontSize: 12, color: T.txt2, marginTop: 2 }}>{live.attemptLabel}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.14em', color: T.txt3 }}>EN JUEGO</div>
                        <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .9, color: T.lime, marginTop: 2 }}><span style={{ fontSize: 30 }}>{live.weight}</span><span style={{ fontSize: 13, color: 'rgba(255,106,0,.6)', marginLeft: 2 }}>kg</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTENTOS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px' }}>
                  <span style={{ width: 4, height: 19, background: T.lime, borderRadius: 2 }} />
                  <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 17, letterSpacing: '.06em', color: T.txt }}>INTENTOS</span>
                </div>
                <div style={{ background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 15, overflow: 'hidden' }}>
                  {LIFTS.map((L, liftIndex) => {
                    const best = selected[L.best]
                    return (
                      <div key={L.key} style={{ padding: '14px 15px', borderTop: liftIndex > 0 ? '1px solid rgba(255,255,255,.07)' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 16, color: T.txt, textTransform: 'uppercase' }}>{L.name}</span>
                          <span style={{ fontFamily: FM, fontSize: 11, color: T.txt3 }}>MEJOR <span style={{ color: T.lime, fontWeight: 600 }}>{best || '—'}</span> kg</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden' }}>
                          {[1, 2, 3].map(i => {
                            const s = attStatus(selected, L.key, L.prefix, i)
                            return (
                              <div key={i} style={{ minWidth: 0, textAlign: 'center', paddingTop: 7, borderLeft: i > 1 ? '1px solid rgba(255,255,255,.08)' : 0 }}>
                                <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.04em', color: T.txt3, marginBottom: 6 }}>{i}º</div>
                                <Attempt status={s.status} label={s.label} big joined />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* DATOS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px' }}>
                  <span style={{ width: 4, height: 19, background: T.lime, borderRadius: 2 }} />
                  <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 17, letterSpacing: '.06em', color: T.txt }}>DATOS</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, overflow: 'hidden' }}>
                  {facts.map((f, index) => (
                    <div key={f.k} style={{ minWidth: 0, padding: '12px 14px', borderLeft: index % 2 === 1 ? '1px solid rgba(255,255,255,.07)' : 0, borderTop: index >= 2 ? '1px solid rgba(255,255,255,.07)' : 0 }}>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.12em', color: T.txt3 }}>{f.k}</div>
                      <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 18, color: T.txt, marginTop: 3 }}>{f.v}</div>
                    </div>
                  ))}
                </div>

                <div onClick={back} style={{ marginTop: 22, textAlign: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 13, fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.1em', color: '#c9ced6', cursor: 'pointer' }}>‹ VOLVER AL RANKING</div>
              </div>
            </div>
          )
        })()}

        {/* ============ VISTA VERSUS (CATEGORÍA EN VIVO) ============ */}
        {view === 'versus' && versusCat && (() => {
          const vlist = versusList
          return (
            <div className="ps-view" style={{ padding: '18px 16px 90px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div onClick={back} style={{ flex: 'none', width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <CaretLeft size={22} weight="bold" color={T.txt} />
                </div>
                <div>
                  <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.14em', color: T.lime }}>CLASIFICACIÓN EN VIVO</div>
                  <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 24, color: T.txt, textTransform: 'uppercase', lineHeight: 1, marginTop: 3 }}>{versusCat}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontFamily: FM, fontSize: 10, color: T.txt3 }}>{vlist.length} atletas · puestos provisionales</span>
                <span style={{ fontFamily: FM, fontSize: 10, color: T.txt3 }}>ORD. POR TOTAL</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {vlist.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: 40, fontFamily: FM, fontSize: 12, letterSpacing: '.1em', color: T.txt4 }}>SIN ATLETAS EN ESTA CATEGORÍA</div>
                ) : vlist.map((a, i) => {
                  const isLive = estado?.atleta_id === a.id
                  const pos = i + 1
                  const podio = pos === 1 ? T.lime : pos === 2 ? '#d0d0d0' : pos === 3 ? '#e0924a' : '#e6e8ec'
                  return (
                    <div key={a.id} ref={el => { if (el) rowRefs.current[a.id] = el }} onClick={() => openDetail(a)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isLive ? 'rgba(255,106,0,.08)' : T.card, border: `1px solid ${isLive ? 'rgba(255,106,0,.35)' : 'rgba(255,255,255,.07)'}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', willChange: 'transform' }}>
                      <span style={{ flex: 'none', width: 28, textAlign: 'center', fontFamily: FO, fontWeight: 700, fontSize: 22, color: podio, lineHeight: 1 }}>{pos}</span>
                      <div style={{ flex: 'none', width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {a.foto ? (
                          <Foto src={a.foto} size={38} />
                        ) : (
                          <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 14, color: T.txt2 }}>{(a.nombre?.[0] || '') + (a.apellido?.[0] || '')}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 17, color: '#f7f8fa', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre} {a.apellido}</span>
                          {isLive && (
                            <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 4, background: T.lime, borderRadius: 5, padding: '2px 5px' }}>
                              <Eq color="#fff" h={7} w={2} />
                              <span style={{ fontFamily: FM, fontSize: 7, letterSpacing: '.06em', fontWeight: 600, color: '#fff' }}>EN VIVO</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily: FM, fontSize: 10, color: T.txt3, marginTop: 3 }}>{a.peso_corporal ?? '—'} kg · {a.modalidad ?? '—'}</div>
                      </div>
                      <div style={{ flex: 'none', textAlign: 'right' }}>
                        <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 18, color: '#f7f8fa', lineHeight: 1 }}>{a.total || 0}<span style={{ fontSize: 11, color: T.txt2, marginLeft: 2 }}>kg</span></div>
                        <div style={{ fontFamily: FM, fontSize: 10, color: T.lime, marginTop: 3 }}>{a.dots ? a.dots.toFixed(1) : '—'} DOTS</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div onClick={back} style={{ marginTop: 22, textAlign: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 13, fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.1em', color: '#c9ced6', cursor: 'pointer' }}>‹ VOLVER</div>
            </div>
          )
        })()}

        {/* ============ VISTA TANDA EN VIVO ============ */}
        {view === 'tanda' && tandaActual != null && (() => {
          const ordenProximos = Array.isArray(estado?.orden_proximos)
            ? estado.orden_proximos.map(Number)
            : []
          return (
            <div className="ps-view" style={{ padding: '18px 16px 90px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div onClick={back} style={{ flex: 'none', width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <CaretLeft size={22} weight="bold" color={T.txt} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: FM, fontSize: 10, letterSpacing: '.14em', color: T.lime }}>
                    <Eq color={T.lime} h={9} w={2} />
                    TANDA EN VIVO
                  </div>
                  <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 28, color: T.txt, textTransform: 'uppercase', lineHeight: 1, marginTop: 4 }}>
                    TANDA {letraTanda(tandaActual)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 118px', background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ minWidth: 0, padding: '11px 13px' }}>
                  <div style={{ fontFamily: FM, fontSize: 8, letterSpacing: '.14em', color: T.txt3 }}>MOVIMIENTO ACTUAL</div>
                  <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 17, color: T.txt, textTransform: 'uppercase', marginTop: 3 }}>{LIFT_LABEL[estado?.ejercicio] || '—'}</div>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,106,0,.25)', background: 'rgba(255,106,0,.09)', padding: '11px 13px', textAlign: 'right' }}>
                  <div style={{ fontFamily: FM, fontSize: 8, letterSpacing: '.14em', color: T.txt3 }}>INTENTO</div>
                  <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 20, color: T.lime, marginTop: 2 }}>{estado?.intento ? `${estado.intento}°` : '—'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tandaList.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: 40, fontFamily: FM, fontSize: 12, letterSpacing: '.1em', color: T.txt4 }}>SIN ATLETAS EN LA TANDA ACTUAL</div>
                ) : tandaList.map((a) => {
                  const isLive = estado?.atleta_id === a.id
                  const proximoIndex = ordenProximos.indexOf(Number(a.id))
                  const campoPeso = estado?.ejercicio && estado?.intento
                    ? `${ORD_WORD[Number(estado.intento) - 1]}_intento_${estado.ejercicio}`
                    : null
                  const pesoATirar = isLive ? estado?.peso : campoPeso ? a[campoPeso] : null
                  const puestoActual = puestoProvisorioMap[a.id]
                  const puestoSiValido = puestoSiValidoMap[a.id]
                  const estadoTanda = isLive
                    ? 'EN PLATAFORMA'
                    : proximoIndex >= 0
                      ? `PRÓXIMO ${proximoIndex + 1}`
                      : 'EN TANDA'
                  return (
                    <div
                      key={a.id}
                      ref={el => { if (el) rowRefs.current[a.id] = el }}
                      onClick={() => openDetail(a)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        position: 'relative',
                        background: isLive ? 'rgba(255,106,0,.09)' : T.card,
                        border: `1px solid ${isLive ? 'rgba(255,106,0,.4)' : 'rgba(255,255,255,.07)'}`,
                        borderRadius: 12, padding: '19px 12px 9px', cursor: 'pointer', willChange: 'transform',
                      }}
                    >
                      <div style={{ position: 'absolute', top: 5, left: 12, display: 'flex', alignItems: 'baseline', gap: 4, fontFamily: FM, lineHeight: 1 }}>
                        <span style={{ fontSize: 7, letterSpacing: '.12em', color: T.txt3 }}>LOT</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: isLive ? T.lime : T.txt2 }}>{a.lot ?? '—'}</span>
                      </div>
                      <div style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,.06)', border: `1px solid ${isLive ? 'rgba(255,106,0,.5)' : 'rgba(255,255,255,.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {a.foto ? (
                          <Foto src={a.foto} size={40} />
                        ) : (
                          <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 14, color: isLive ? T.lime : T.txt2 }}>{(a.nombre?.[0] || '') + (a.apellido?.[0] || '')}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 17, color: '#f7f8fa', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre} {a.apellido}</div>
                        <div style={{ fontFamily: FM, fontSize: 9, color: T.txt3, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{claveCategoriaAtleta(a)}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, borderRadius: 4, padding: '2px 6px', background: isLive ? T.lime : 'rgba(255,255,255,.06)', color: isLive ? '#fff' : T.txt2 }}>
                          {isLive && <Eq color="#fff" h={8} w={2} />}
                          <span style={{ fontFamily: FM, fontSize: 7, letterSpacing: '.08em', fontWeight: 600 }}>{estadoTanda}</span>
                        </div>
                        <div style={{ fontFamily: FM, fontSize: 10, color: isLive ? T.lime : T.txt2, marginTop: 4, fontWeight: 700 }}>
                          A TIRAR: {pesoATirar ? `${pesoATirar} kg` : '—'}
                        </div>
                      </div>
                      <div style={{ flex: 'none', textAlign: 'right' }}>
                        <div style={{ fontFamily: FM, fontSize: 8, color: T.txt3, letterSpacing: '.08em' }}>PUESTO ACTUAL</div>
                        <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 22, color: T.lime, lineHeight: 1, marginTop: 2 }}>{puestoActual ? `#${puestoActual}` : '—'}</div>
                        <div style={{ fontFamily: FM, fontSize: 7, color: T.txt3, letterSpacing: '.04em', marginTop: 3 }}>
                          SI ES VÁLIDO: <span style={{ color: T.txt2, fontSize: 9, fontWeight: 600 }}>{puestoSiValido ? `#${puestoSiValido}` : '—'}</span>
                        </div>
                        <div style={{ fontFamily: FM, fontSize: 9, color: T.txt2, marginTop: 3 }}>{a.total || 0} kg TOTAL</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div onClick={back} style={{ marginTop: 22, textAlign: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 13, fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.1em', color: '#c9ced6', cursor: 'pointer' }}>‹ VOLVER</div>
            </div>
          )
        })()}

        {/* ============ VISTA TABLA DE INTENTOS (TODOS LOS ATLETAS) ============ */}
        {view === 'tabla' && (
          <div className="ps-view" style={{ padding: '18px 16px 90px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div onClick={back} style={{ flex: 'none', width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <CaretLeft size={22} weight="bold" color={T.txt} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.14em', color: T.lime }}>TODOS LOS ATLETAS</div>
                <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 24, color: T.txt, textTransform: 'uppercase', lineHeight: 1, marginTop: 3 }}>TABLA DE INTENTOS</div>
              </div>
            </div>

            {/* ---- BUSCADOR + FILTROS ---- */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 15, position: 'relative', zIndex: 5, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 15px' }}>
                <span style={{ width: 15, height: 15, border: '1.7px solid #6b7280', borderRadius: '50%', position: 'relative', flex: 'none' }}>
                  <span style={{ position: 'absolute', width: 6, height: '1.7px', background: '#6b7280', transform: 'rotate(45deg)', bottom: -2, right: -4 }} />
                </span>
                <input value={tablaBusqueda} onChange={(e) => setTablaBusqueda(e.target.value)} placeholder="Nombre o apellido…"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: FB, fontSize: 14, color: '#e6e8ec' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: `1px solid ${T.line}` }}>
                <PowerSelect
                  label="Tanda"
                  value={tablaTanda}
                  options={[
                    { value: 'todas', label: 'Todas las tandas' },
                    ...tandasDisponibles.map((id) => ({ value: String(id), label: `Tanda ${letraTanda(id)}` })),
                  ]}
                  onChange={setTablaTanda}
                />
                <PowerSelect
                  divider
                  label="Categoría de peso"
                  value={tablaCat}
                  options={[
                    { value: 'todas', label: 'Todas las categorías' },
                    ...categoriasTabla.map((categoria) => ({ value: categoria, label: categoria })),
                  ]}
                  onChange={setTablaCat}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <span style={{ fontFamily: FM, fontSize: 10, color: T.txt3 }}>{tablaFiltrada.length} atletas</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: T.txt3 }}>DESLIZÁ PARA VER TODO →</span>
            </div>

            {tablaFiltrada.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 40, fontFamily: FM, fontSize: 12, letterSpacing: '.1em', color: T.txt4 }}>
                {loadedRef.current ? 'SIN ATLETAS PARA MOSTRAR' : 'CARGANDO…'}
              </div>
            ) : (
              <div className="ps-tbl-wrap" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
                <table className="ps-tbl">
                  <colgroup>
                    {TABLA_HEAD.map(([label, width]) => <col key={label} style={{ width }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      {TABLA_HEAD.map(([label]) => (
                        <th
                          key={label}
                          style={{
                            background: 'rgba(255,255,255,.05)', color: T.txt2,
                            fontFamily: FM, fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                            textTransform: 'uppercase', padding: '10px 6px', whiteSpace: 'nowrap',
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tablaFiltrada.map((a) => (
                      <tr key={a.id} onClick={() => openDetail(a)}>
                        <CeldaCatTabla atleta={a}>{a.lot ?? '-'}</CeldaCatTabla>
                        <CeldaCatTabla atleta={a} align="left" font={FB} size={13} weight={700}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {capitalizeWords(a.apellido)} {capitalizeWords(a.nombre)}
                          </span>
                        </CeldaCatTabla>
                        <CeldaCatTabla atleta={a}>{a.tanda_id ? letraTanda(a.tanda_id) : '-'}</CeldaCatTabla>
                        <CeldaCatTabla atleta={a}>{a.peso_corporal ?? '-'}</CeldaCatTabla>
                        <CeldaCatTabla atleta={a} size={11} weight={700}>
                          {a.categoria ? claveCategoriaPlataforma(a) : '-'}
                        </CeldaCatTabla>
                        {LIFTS.map((L) => (
                          [1, 2, 3].map((i) => (
                            <CeldaIntentoTabla key={`${L.prefix}${i}`} atleta={a} lift={L} i={i} />
                          ))
                        ))}
                        <CeldaCatTabla atleta={a} weight={700}>{a.total || '-'}</CeldaCatTabla>
                        <CeldaCatTabla atleta={a} weight={700}>{a.descalificado ? 'DQ' : (a.puesto || '-')}</CeldaCatTabla>
                        <CeldaCatTabla atleta={a}>{a.ipf_gl ? a.ipf_gl.toFixed(2) : '-'}</CeldaCatTabla>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div onClick={back} style={{ marginTop: 22, textAlign: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 13, fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.1em', color: '#c9ced6', cursor: 'pointer' }}>‹ VOLVER</div>
          </div>
        )}

      </div>
    </div>
  )
}
