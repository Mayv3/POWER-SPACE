'use client'

import { Box, IconButton, Tooltip, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Logout as LogoutIcon, DarkMode as DarkModeIcon, LightMode as LightModeIcon } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDarkMode } from '../context/ThemeContext'

type TabItem = { label: string; icon: React.ReactNode; route: string }
type FloatingTabsProps = { tabs: TabItem[] }

function readPrimary(): string {
  if (typeof window === 'undefined') return '#6366F1'
  try {
    const raw = localStorage.getItem('gym_settings')
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.colors?.primary || '#6366F1'
  } catch {
    return '#6366F1'
  }
}

export const FloatingTabs = ({ tabs }: FloatingTabsProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [mounted, setMounted] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const router = useRouter()
  const pathname = usePathname()

  const [primary, setPrimary] = useState<string>(() => readPrimary())
  const { isDark, toggle } = useDarkMode()

  const [revealed, setRevealed] = useState(false)
  const visible = isMobile || revealed

  const handleNav = (route: string, index?: number) => {
    if (typeof index === 'number') setSelectedIndex(index)
    if (route === '/publico/vista') {
      window.open(route, '_blank')
    } else {
      router.push(route)
    }
  }

  useEffect(() => {
    const idx = tabs.findIndex(t => t.route === pathname)
    if (idx !== -1) setSelectedIndex(idx)
  }, [pathname, tabs])

  useEffect(() => {
    setMounted(true)
    setPrimary(readPrimary())
  }, [])

  if (!mounted) return null

  const btnBase = {
    width: 44,
    height: 44,
    borderRadius: '14px',
    transition: 'background-color .2s ease, color .2s ease',
  }

  const navButton = (tab: TabItem, index: number) => {
    const selected = selectedIndex === index
    return (
      <Tooltip key={tab.route} title={tab.label} placement="top" arrow>
        <IconButton
          disableRipple
          onClick={() => handleNav(tab.route, index)}
          sx={{
            ...btnBase,
            color: selected ? '#fff' : 'rgba(255,255,255,0.55)',
            bgcolor: selected ? primary : 'transparent',
            '&:hover': {
              bgcolor: selected ? primary : 'rgba(255,255,255,0.08)',
              color: selected ? '#fff' : 'rgba(255,255,255,0.9)',
            },
          }}
        >
          {tab.icon}
        </IconButton>
      </Tooltip>
    )
  }

  return (
    <>
      {/* Bottom hover trigger: pasar el mouse por debajo revela el dock */}
      {!isMobile && (
        <Box
          onMouseEnter={() => setRevealed(true)}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 30,
            zIndex: 1200,
          }}
        />
      )}

      <Box
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        sx={{
          position: 'fixed',
          bottom: { xs: 12, sm: 20 },
          left: '50%',
          transform: visible
            ? 'translate(-50%, 0)'
            : 'translate(-50%, calc(100% + 40px))',
          zIndex: 1201,
          pointerEvents: visible ? 'auto' : 'none',
          opacity: visible ? 1 : 0,
          transition: 'transform .3s cubic-bezier(.4,0,.2,1), opacity .25s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 0.75,
          maxWidth: 'calc(100vw - 16px)',
          borderRadius: '20px',
          bgcolor: '#1c1c1e',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          overflowX: 'auto',
          overflowY: 'hidden',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((tab, index) => navButton(tab, index))}

        <Box sx={{ width: '1px', height: 28, bgcolor: 'rgba(255,255,255,0.12)', mx: 0.5, flexShrink: 0 }} />

        <Tooltip title={isDark ? 'Modo claro' : 'Modo oscuro'} placement="top" arrow>
          <IconButton
            disableRipple
            onClick={toggle}
            sx={{
              ...btnBase,
              color: 'rgba(255,255,255,0.55)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)' },
            }}
          >
            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Salir" placement="top" arrow>
          <IconButton
            disableRipple
            onClick={() => router.push('/')}
            sx={{
              ...btnBase,
              color: 'rgba(255,255,255,0.55)',
              '&:hover': { bgcolor: 'rgba(255,80,80,0.15)', color: '#ff6b6b' },
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </>
  )
}
