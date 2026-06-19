'use client'

import { useEffect, useLayoutEffect, useState, useMemo, useRef, Children } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { Calculate_DOTS } from '../../utils/calcularDots'
import { supabase, fetchAtletasConIntentos } from '../../lib/supabaseClient'
import categorias from '../../const/categorias/categorias'

/* ============ TEMA ============ */
const T = {
  pageBg: '#e7e5df', frame: '#08090b', card: '#101318', lime: '#c0f93b',
  line: 'rgba(255,255,255,.07)', line2: 'rgba(255,255,255,.08)',
  txt: '#f4f5f7', txt2: '#9aa0ab', txt3: '#6b7280', txt4: '#4b515c',
  ok: '#dff79a', okBg: 'rgba(192,249,59,.1)', fail: '#ef5a54', failBg: 'rgba(239,90,84,.1)',
}
const FO = "'Oswald',sans-serif"
const FB = "'Barlow',sans-serif"
const FM = "'IBM Plex Mono',monospace"

const LIFTS = [
  { name: 'Sentadilla', key: 'sentadilla', prefix: 's', best: 'mejorSentadilla' },
  { name: 'Press banca', key: 'banco', prefix: 'b', best: 'mejorBanco' },
  { name: 'Peso muerto', key: 'peso_muerto', prefix: 'd', best: 'mejorPesoMuerto' },
]
const LIFT_LABEL = { sentadilla: 'Sentadilla', banco: 'Press banca', peso_muerto: 'Peso muerto' }
const ORD_WORD = ['primer', 'segundo', 'tercer']

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
  return { ...a, mejorSentadilla, mejorBanco, mejorPesoMuerto, total, dots }
}

const fmtTimer = (s) => {
  const n = Math.max(0, parseInt(s) || 0)
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
}

/* ============ CELDA INTENTO ============ */
function Attempt({ status, label, big }) {
  const base = {
    textAlign: 'center', fontFamily: FM, fontSize: big ? 16 : 13,
    borderRadius: big ? 8 : 6, padding: big ? '10px 0' : '6px 0', position: 'relative',
  }
  if (status === 'ok') return <div style={{ ...base, fontWeight: 600, color: T.ok, background: T.okBg }}>{label}</div>
  if (status === 'fail') return <div style={{ ...base, color: T.fail, background: T.failBg, textDecoration: 'line-through' }}>{label}</div>
  if (status === 'current') return (
    <div style={{ ...base, fontWeight: 600, color: T.lime, background: 'rgba(192,249,59,.05)', border: '1px solid rgba(192,249,59,.5)' }}>
      {label}
      <span style={{ position: 'absolute', top: -3, right: -3, width: big ? 7 : 6, height: big ? 7 : 6, borderRadius: '50%', background: T.lime, animation: 'psDot 1.4s ease-in-out infinite' }} />
    </div>
  )
  if (status === 'pending') return <div style={{ ...base, color: T.txt2, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)' }}>{label}</div>
  return <div style={{ ...base, color: '#4b515c', background: 'rgba(255,255,255,.03)' }}>{label}</div>
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

export default function PublicoPage() {
  const [atletas, setAtletas] = useState([])
  const [sexoSel, setSexoSel] = useState('Masculino')
  const [catSel, setCatSel] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [atletaEnVivo, setAtletaEnVivo] = useState(null)
  const [estado, setEstado] = useState(null)
  const [view, setView] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [versusCat, setVersusCat] = useState(null)
  const [secs, setSecs] = useState(0)
  const [updating, setUpdating] = useState(false)
  const loadedRef = useRef(false)
  const rankingRef = useRef(null)
  const preloadedRef = useRef(new Set())

  /* ---- carga + realtime intentos ---- */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAtletasConIntentos({ tandaId: 'todas' })
        setAtletas(data.map(computeAtleta))
      } catch (e) { console.error('Error al cargar atletas:', e) }
      finally { loadedRef.current = true }
    }
    load()

    const ch = supabase
      .channel('public:intentos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intentos' }, async (payload) => {
        const id = payload.new?.atleta_id || payload.old?.atleta_id
        if (!id) return
        setUpdating(true)
        try {
          const data = await fetchAtletasConIntentos({ atletaId: id })
          if (!data.length) return
          const upd = computeAtleta(data[0])
          setAtletas(prev => prev.map(a => a.id === id ? upd : a))
        } catch (e) { console.error('Error al actualizar atleta:', e) }
        finally { setTimeout(() => setUpdating(false), 500) }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  /* ---- estado en vivo ---- */
  useEffect(() => {
    const fetchEstado = async () => {
      const { data } = await supabase.from('estado_competencia').select('*').eq('id', 1).maybeSingle()
      if (!data) return
      setEstado(data)
      if (data.atleta_id) {
        const { data: at } = await supabase.from('atletas').select('*').eq('id', data.atleta_id).single()
        setAtletaEnVivo(at)
      } else setAtletaEnVivo(null)
    }
    fetchEstado()

    const ch = supabase
      .channel('public:estado_competencia_publico')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estado_competencia', filter: 'id=eq.1' }, async (payload) => {
        setEstado(payload.new)
        if (payload.new.atleta_id) {
          const { data: at } = await supabase.from('atletas').select('*').eq('id', payload.new.atleta_id).single()
          setAtletaEnVivo(at)
        } else setAtletaEnVivo(null)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  /* ---- cronómetro local ---- */
  useEffect(() => {
    if (!estado) return
    setSecs(estado.tiempo_restante ?? 0)
    if (!estado.corriendo) return
    const t = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [estado?.tiempo_restante, estado?.corriendo])

  /* ---- posición por categoría (sobre todo el padrón) ---- */
  const posMap = useMemo(() => {
    const groups = {}
    atletas.forEach(a => { (groups[a.categoria] ??= []).push(a) })
    const m = {}
    Object.values(groups).forEach(list => {
      list.sort((x, y) => (y.dots || 0) - (x.dots || 0)).forEach((a, i) => { m[a.id] = i + 1 })
    })
    return m
  }, [atletas])

  /* ---- filtrado ---- */
  const filtrados = useMemo(() => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      return atletas.filter(a =>
        `${a.nombre ?? ''} ${a.apellido ?? ''}`.toLowerCase().includes(q))
    }
    const sx = sexoSel === 'Masculino' ? 'M' : 'F'
    let r = atletas.filter(a => a.sexo === sx)
    if (catSel !== 'todas') r = r.filter(a => a.categoria === catSel)
    return r
  }, [atletas, busqueda, sexoSel, catSel])

  /* ---- agrupado por categoría (ordenado) ---- */
  const grupos = useMemo(() => {
    const g = {}
    filtrados.forEach(a => { (g[a.categoria] ??= []).push(a) })
    const getPeso = (cat) => {
      const m = cat?.match(/\+?(\d+)kg/)
      if (!m) return 0
      return cat.includes('+') ? parseInt(m[1]) + 0.5 : parseInt(m[1])
    }
    return Object.entries(g)
      .map(([cat, list]) => [cat, list.sort((x, y) => (y.dots || 0) - (x.dots || 0))])
      .sort(([a], [b]) => {
        const am = a.startsWith('M'), bm = b.startsWith('M')
        if (am && !bm) return -1
        if (!am && bm) return 1
        return getPeso(a) - getPeso(b)
      })
  }, [filtrados])

  /* ---- próximos ---- */
  const proximos = useMemo(() => {
    if (!atletaEnVivo || !estado) return []
    if (Array.isArray(estado.orden_proximos)) {
      const byId = new Map(atletas.map(a => [a.id, a]))
      return estado.orden_proximos.map(id => byId.get(id)).filter(Boolean)
    }
    const mismaTanda = atletas.filter(a => a.tanda_id === atletaEnVivo.tanda_id)
    const i = mismaTanda.findIndex(a => a.id === atletaEnVivo.id)
    return i === -1 ? [] : mismaTanda.slice(i + 1)
  }, [atletaEnVivo, estado, atletas])

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
    return atletas.find(a => a.id === atletaEnVivo.id) || computeAtleta(atletaEnVivo)
  }, [atletaEnVivo, atletas])

  const live = useMemo(() => {
    if (!liveA || !estado) return null
    const liftKey = estado.ejercicio
    const bestKey = LIFTS.find(l => l.key === liftKey)?.best
    const subtotal = liveA.total || 0
    const bestCur = bestKey ? (liveA[bestKey] || 0) : 0
    const proj = subtotal + Math.max(0, (estado.peso || 0) - bestCur)
    return {
      name: `${atletaEnVivo.nombre ?? ''} ${atletaEnVivo.apellido ?? ''}`.trim(),
      cat: [atletaEnVivo.categoria, atletaEnVivo.modalidad].filter(Boolean).join(' · '),
      bw: atletaEnVivo.peso_corporal, age: atletaEnVivo.edad,
      lift: LIFT_LABEL[liftKey] || '—',
      attemptLabel: estado.intento ? `${estado.intento}º intento` : '',
      weight: estado.peso ?? '—',
      subtotal, proj, pos: posMap[liveA.id] || '—',
    }
  }, [liveA, estado, atletaEnVivo, posMap])

  /* ---- detalle ---- */
  const selected = useMemo(() => atletas.find(a => a.id === selectedId) || null, [atletas, selectedId])

  /* ---- lista versus (categoría en vivo) + reordenamiento FLIP ---- */
  const versusList = useMemo(() => {
    if (!versusCat) return []
    return atletas.filter(a => a.categoria === versusCat).sort((x, y) => (y.dots || 0) - (x.dots || 0))
  }, [atletas, versusCat])
  const rowRefs = useRef({})
  const prevTops = useRef({})
  useLayoutEffect(() => {
    if (view !== 'versus') { prevTops.current = {}; return }
    const next = {}
    versusList.forEach(a => { const el = rowRefs.current[a.id]; if (el) next[a.id] = el.offsetTop })
    versusList.forEach(a => {
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
  }, [versusList, view])

  const openDetail = (a) => { setSelectedId(a.id); setView('detail'); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }) }
  const back = () => { setView('list'); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }) }
  const verCategoria = () => {
    if (!atletaEnVivo) return
    setVersusCat(atletaEnVivo.categoria)
    setView('versus')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  /* ---- estado de intento ---- */
  const attStatus = (a, liftKey, prefix, i) => {
    const peso = a[`${ORD_WORD[i - 1]}_intento_${liftKey}`]
    const valido = a[`valido_${prefix}${i}`]
    let status = 'empty'
    if (valido === true) status = 'ok'
    else if (valido === false) status = 'fail'
    else if (peso) {
      const cur = estado?.atleta_id === a.id && estado?.ejercicio === liftKey && estado?.intento === i
      status = cur ? 'current' : 'pending'
    }
    return { status, label: peso ? String(peso) : '—' }
  }

  const palette = (pos, isLive) => {
    if (isLive) return { border: 'rgba(192,249,59,.4)', posBg: 'rgba(192,249,59,.12)', posColor: T.lime, posTag: 'LIVE' }
    if (pos === 1) return { border: 'rgba(192,249,59,.22)', posBg: 'rgba(192,249,59,.1)', posColor: T.lime, posTag: 'LÍDER' }
    return { border: 'rgba(255,255,255,.06)', posBg: 'rgba(255,255,255,.04)', posColor: '#e6e8ec', posTag: '' }
  }

  const catsDisponibles = sexoSel === 'Masculino' ? categorias.M : categorias.F
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()

  const selStyle = {
    flex: 1, background: T.card, border: `1px solid ${T.line}`, borderRadius: 13, padding: '10px 14px',
    color: '#e6e8ec', fontFamily: FB, fontSize: 14, appearance: 'none', WebkitAppearance: 'none', outline: 'none',
  }

  return (
    <div className="ps-outer">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Oswald:wght@400;500;600;700&display=swap');
        @keyframes psEq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
        @keyframes psDot{0%,100%{opacity:.25}50%{opacity:1}}
        .ps-x::-webkit-scrollbar{display:none}
        .ps-bar{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${T.lime},transparent);z-index:99;animation:psBar 1s linear infinite}
        @keyframes psBar{0%{opacity:.3}50%{opacity:1}100%{opacity:.3}}
        .ps-view{animation:psIn .4s cubic-bezier(.22,.61,.36,1) both}
        @keyframes psIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes psHero{from{transform:scale(1.12);opacity:.3}to{transform:scale(1);opacity:1}}
        @keyframes psRow{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .ps-outer{min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:40px 24px;background:${T.pageBg};font-family:${FB}}
        .ps-frame{width:430px;max-width:100%;background:${T.frame};border-radius:30px;overflow:hidden;box-shadow:0 30px 80px rgba(20,18,14,.32);border:1px solid rgba(0,0,0,.5)}
        @media (max-width:600px){
          .ps-outer{padding:0;background:${T.frame};align-items:stretch}
          .ps-frame{width:100%;max-width:100%;border-radius:0;border:none;box-shadow:none;min-height:100vh}
        }`}</style>

      {updating && <div className="ps-bar" />}

      <div className="ps-frame">

        {/* ============ HEADER ============ */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(14px)', background: 'rgba(8,9,11,.82)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/powerspace_logo.png" alt="POWERSPACE" style={{ height: 34, width: 34, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />
              <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 21, letterSpacing: '.02em', color: T.txt, position: 'relative', paddingBottom: 5 }}>
                POWERSPACE<span style={{ position: 'absolute', left: 0, bottom: 0, width: 38, height: 4, background: T.lime }} />
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.12em', color: T.lime }}>{atletaEnVivo ? 'EN VIVO' : 'RANKING'}</div>
              <div style={{ fontFamily: FM, fontSize: 10, color: T.txt3, marginTop: 2 }}>{hoy}</div>
            </div>
          </div>
        </div>

        {/* ============ VISTA LISTA ============ */}
        {view === 'list' && (
          <div className="ps-view" style={{ padding: '18px 16px 90px' }}>

            {/* ---- LIVE ---- */}
            {live && (
              <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: T.card, border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: T.lime }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Eq color="#0b0d0a" />
                    <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.18em', color: '#0b0d0a' }}>EN VIVO</span>
                  </div>
                  <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 600, color: '#0b0d0a' }}>{fmtTimer(secs)}</span>
                </div>

                <div style={{ padding: '18px 16px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.12em', color: T.txt3 }}>PLATAFORMA</div>
                    <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 32, lineHeight: .95, color: '#f7f8fa', textTransform: 'uppercase', letterSpacing: '.01em', marginTop: 5 }}>{live.name}</div>
                    <div style={{ fontSize: 13, color: T.txt2, marginTop: 6 }}>{live.cat}</div>
                    <div style={{ fontFamily: FM, fontSize: 11, color: T.txt3, marginTop: 4 }}>{live.bw ?? '—'} kg BW · {live.age ?? '—'} años</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginTop: 16 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 13, padding: '13px 15px' }}>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.14em', color: T.txt3, marginBottom: 6 }}>MOVIMIENTO</div>
                      <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 19, color: T.txt, textTransform: 'uppercase' }}>{live.lift}</div>
                      <div style={{ fontSize: 12, color: T.lime, marginTop: 2 }}>{live.attemptLabel}</div>
                    </div>
                    <div style={{ flex: 'none', width: 130, background: T.lime, borderRadius: 13, padding: '13px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.14em', color: 'rgba(11,13,10,.6)', marginBottom: 2 }}>EN JUEGO</div>
                      <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .85, color: '#0b0d0a' }}>
                        <span style={{ fontSize: String(live.weight).length >= 5 ? 30 : String(live.weight).length >= 4 ? 36 : 44 }}>{live.weight}</span><span style={{ fontSize: 15, marginLeft: 2 }}>kg</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.07)' }}>
                    <div>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.16em', color: T.txt3 }}>SUBTOTAL</div>
                      <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 22, color: '#f7f8fa', lineHeight: 1, marginTop: 3 }}>{live.subtotal}<span style={{ fontSize: 12, color: T.txt2, marginLeft: 3 }}>kg</span></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.16em', color: T.txt3 }}>PROYECCIÓN</div>
                      <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 22, color: T.lime, lineHeight: 1, marginTop: 3 }}>{live.proj}<span style={{ fontSize: 12, color: 'rgba(192,249,59,.6)', marginLeft: 3 }}>kg</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.16em', color: T.txt3 }}>POSICIÓN</div>
                      <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 22, color: '#f7f8fa', lineHeight: 1, marginTop: 3 }}>{live.pos}°</div>
                    </div>
                  </div>

                  <div onClick={() => openDetail(liveA)} style={{ marginTop: 14, textAlign: 'center', background: 'rgba(192,249,59,.1)', border: '1px solid rgba(192,249,59,.3)', borderRadius: 11, padding: 11, fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.1em', color: T.lime, cursor: 'pointer' }}>VER PERFIL COMPLETO</div>
                  <div onClick={verCategoria} style={{ marginTop: 8, textAlign: 'center', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 11, padding: 11, fontFamily: FO, fontWeight: 600, fontSize: 13, letterSpacing: '.06em', color: '#c9ced6', cursor: 'pointer' }}>{(atletaEnVivo?.nombre || '').toUpperCase()} VS {(atletaEnVivo?.categoria || '').toUpperCase()}</div>
                </div>
              </div>
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
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: T.lime, color: '#0b0d0a', fontFamily: FO, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      <span>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#e6e8ec', lineHeight: 1.1 }}>{np.nombre} {np.apellido}</span>
                        <span style={{ display: 'block', fontFamily: FM, fontSize: 10, color: T.txt3 }}>{np.categoria}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---- BUSCADOR + FILTROS ---- */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: T.card, border: `1px solid ${T.line}`, borderRadius: 13, padding: '14px 15px' }}>
                <span style={{ width: 15, height: 15, border: '1.7px solid #6b7280', borderRadius: '50%', position: 'relative', flex: 'none' }}>
                  <span style={{ position: 'absolute', width: 6, height: '1.7px', background: '#6b7280', transform: 'rotate(45deg)', bottom: -2, right: -4 }} />
                </span>
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar atleta…"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: FB, fontSize: 14, color: '#e6e8ec' }} />
              </div>
              {!busqueda.trim() && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <select value={sexoSel} onChange={(e) => { setSexoSel(e.target.value); setCatSel('todas') }} style={selStyle}>
                    <option>Masculino</option><option>Femenino</option>
                  </select>
                  <select value={catSel} onChange={(e) => setCatSel(e.target.value)} style={selStyle}>
                    <option value="todas">Todas</option>
                    {catsDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

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
                  {list.map((item) => {
                    const isLive = estado?.atleta_id === item.id
                    const pos = posMap[item.id] || 0
                    const pal = palette(pos, isLive)
                    return (
                      <div key={item.id} onClick={() => openDetail(item)} style={{ background: T.card, border: `1px solid ${pal.border}`, borderRadius: 18, overflow: 'hidden', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                          <div style={{ flex: 'none', width: 54, background: pal.posBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 27, color: pal.posColor, lineHeight: .9 }}>{pos || '—'}</span>
                            {pal.posTag && <span style={{ fontFamily: FM, fontSize: 8, color: pal.posColor, opacity: .7 }}>{pal.posTag}</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, padding: '13px 15px', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 21, color: '#f7f8fa', textTransform: 'uppercase', lineHeight: 1 }}>{item.nombre} {item.apellido}</span>
                                {isLive && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: T.lime, borderRadius: 5, padding: '3px 6px' }}>
                                    <Eq color="#0b0d0a" h={8} w={2} />
                                    <span style={{ fontFamily: FM, fontSize: 8, letterSpacing: '.08em', fontWeight: 600, color: '#0b0d0a' }}>EN VIVO</span>
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
                                {[1, 2, 3].map(i => { const s = attStatus(item, L.key, L.prefix, i); return <Attempt key={i} status={s.status} label={s.label} /> })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
                          <div style={{ flex: 1, padding: '13px 15px', background: 'rgba(255,255,255,.03)' }}>
                            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.18em', color: T.txt3 }}>TOTAL</div>
                            <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .9, color: '#f7f8fa', marginTop: 2 }}><span style={{ fontSize: 30 }}>{item.total || 0}</span><span style={{ fontSize: 13, color: T.txt2, marginLeft: 3 }}>kg</span></div>
                          </div>
                          <div style={{ flex: 'none', padding: '13px 16px', textAlign: 'right', background: 'rgba(192,249,59,.08)' }}>
                            <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.18em', color: T.txt3 }}>DOTS</div>
                            <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 22, lineHeight: .9, color: T.lime, marginTop: 2 }}>{item.dots ? item.dots.toFixed(2) : '—'}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
          const facts = [
            { k: 'PESO CORPORAL', v: `${selected.peso_corporal ?? '—'} kg` },
            { k: 'EDAD', v: `${selected.edad ?? '—'} años` },
            { k: 'MODALIDAD', v: selected.modalidad ?? '—' },
            { k: 'CATEGORÍA', v: selected.categoria ?? '—' },
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
                    <Eq color="#0b0d0a" h={10} w={2.5} />
                    <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 11, letterSpacing: '.14em', color: '#0b0d0a' }}>EN VIVO</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '18px 16px', marginTop: -80, position: 'relative', zIndex: 1 }}>
                {/* TÍTULO + DATOS (superpuesto sobre la foto) */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 13, color: '#0b0d0a', background: T.lime, borderRadius: 6, padding: '2px 9px' }}>{pos || '—'}º</span>
                    <span style={{ fontFamily: FM, fontSize: 10, letterSpacing: '.12em', color: T.txt2 }}>{posTagLong}</span>
                  </div>
                  <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 42, lineHeight: .92, color: '#f7f8fa', textTransform: 'uppercase', letterSpacing: '.01em' }}>{selected.nombre} {selected.apellido}</div>
                  <div style={{ fontSize: 13, color: T.txt2, marginTop: 7 }}>{selected.categoria} · {selected.peso_corporal ?? '—'} kg BW · {selected.edad ?? '—'} años</div>
                </div>

                {/* STATS */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 15px' }}>
                    <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.16em', color: T.txt3 }}>TOTAL</div>
                    <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .9, color: '#f7f8fa', marginTop: 4 }}><span style={{ fontSize: 32 }}>{selected.total || 0}</span><span style={{ fontSize: 13, color: T.txt2, marginLeft: 3 }}>kg</span></div>
                  </div>
                  <div style={{ flex: 1, background: T.card, border: '1px solid rgba(192,249,59,.25)', borderRadius: 14, padding: '14px 15px' }}>
                    <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.16em', color: T.txt3 }}>DOTS</div>
                    <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 32, lineHeight: .9, color: T.lime, marginTop: 4 }}>{selected.dots ? selected.dots.toFixed(2) : '—'}</div>
                  </div>
                </div>

                {/* LEVANTANDO AHORA */}
                {isLive && live && (
                  <div style={{ marginTop: 14, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(192,249,59,.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px', background: 'rgba(192,249,59,.12)' }}>
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
                        <div style={{ fontFamily: FO, fontWeight: 700, lineHeight: .9, color: T.lime, marginTop: 2 }}><span style={{ fontSize: 30 }}>{live.weight}</span><span style={{ fontSize: 13, color: 'rgba(192,249,59,.6)', marginLeft: 2 }}>kg</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTENTOS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px' }}>
                  <span style={{ width: 4, height: 19, background: T.lime, borderRadius: 2 }} />
                  <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 17, letterSpacing: '.06em', color: T.txt }}>INTENTOS</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {LIFTS.map(L => {
                    const best = selected[L.best]
                    return (
                      <div key={L.key} style={{ background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 15, padding: '14px 15px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ fontFamily: FO, fontWeight: 600, fontSize: 16, color: T.txt, textTransform: 'uppercase' }}>{L.name}</span>
                          <span style={{ fontFamily: FM, fontSize: 11, color: T.txt3 }}>MEJOR <span style={{ color: T.lime, fontWeight: 600 }}>{best || '—'}</span> kg</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[1, 2, 3].map(i => {
                            const s = attStatus(selected, L.key, L.prefix, i)
                            return (
                              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: '.04em', color: T.txt3, marginBottom: 6 }}>{i}º</div>
                                <Attempt status={s.status} label={s.label} big />
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {facts.map(f => (
                    <div key={f.k} style={{ flex: 1, minWidth: 'calc(50% - 5px)', background: T.card, border: '1px solid rgba(255,255,255,.07)', borderRadius: 13, padding: '12px 14px' }}>
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
                <span style={{ fontFamily: FM, fontSize: 10, color: T.txt3 }}>ORD. POR DOTS</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vlist.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: 40, fontFamily: FM, fontSize: 12, letterSpacing: '.1em', color: T.txt4 }}>SIN ATLETAS EN ESTA CATEGORÍA</div>
                ) : vlist.map((a, i) => {
                  const isLive = estado?.atleta_id === a.id
                  const pos = i + 1
                  const podio = pos === 1 ? T.lime : pos === 2 ? '#d0d0d0' : pos === 3 ? '#e0924a' : '#e6e8ec'
                  return (
                    <div key={a.id} ref={el => { if (el) rowRefs.current[a.id] = el }} onClick={() => openDetail(a)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isLive ? 'rgba(192,249,59,.08)' : T.card, border: `1px solid ${isLive ? 'rgba(192,249,59,.35)' : 'rgba(255,255,255,.07)'}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', willChange: 'transform' }}>
                      <span style={{ flex: 'none', width: 28, textAlign: 'center', fontFamily: FO, fontWeight: 700, fontSize: 22, color: podio, lineHeight: 1 }}>{pos}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontFamily: FO, fontWeight: 700, fontSize: 17, color: '#f7f8fa', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre} {a.apellido}</span>
                          {isLive && (
                            <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 4, background: T.lime, borderRadius: 5, padding: '2px 5px' }}>
                              <Eq color="#0b0d0a" h={7} w={2} />
                              <span style={{ fontFamily: FM, fontSize: 7, letterSpacing: '.06em', fontWeight: 600, color: '#0b0d0a' }}>EN VIVO</span>
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

      </div>
    </div>
  )
}
