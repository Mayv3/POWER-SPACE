'use client'

import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useMediaQuery,
  Tooltip,
  Divider,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import LogoutIcon from '@mui/icons-material/Logout'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDarkMode } from '../context/ThemeContext'

type TabItem = { label: string; icon: React.ReactNode; route: string }
type HeaderComponentProps = { tabs: TabItem[] }

function readPrimary(): string {
  if (typeof window === 'undefined') return '#F57C00'
  try {
    const raw = localStorage.getItem('gym_settings')
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.colors?.primary || '#F57C00'
  } catch {
    return '#F57C00'
  }
}

export const SideBar = ({ tabs }: HeaderComponentProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mounted, setMounted] = useState(false)

  const [isHovered, setIsHovered] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const isExpanded = isHovered || isLocked

  const router = useRouter()
  const pathname = usePathname()

  const [sidebarBg, setSidebarBg] = useState<string>(() => readPrimary())
  const { isDark, toggle } = useDarkMode()

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
    if (!isLocked) return
    const t = setTimeout(() => setIsLocked(false), 150)
    return () => clearTimeout(t)
  }, [pathname, isLocked])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const darkModeButton = (
    <ListItemButton
      disableRipple
      onClick={toggle}
      sx={{
        borderRadius: 2,
        height: 48,
        px: 1.45,
        width: '100%',
        bgcolor: 'transparent',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' },
      }}
    >
      <ListItemIcon sx={{ color: 'white', minWidth: 0, mr: isExpanded ? 1.5 : 0 }}>
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </ListItemIcon>
      <Box
        sx={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          opacity: isExpanded ? 1 : 0,
          width: isExpanded ? 'auto' : 0,
          transition: 'opacity .25s ease, width .25s ease',
        }}
      >
        <ListItemText
          primary={isDark ? 'Modo claro' : 'Modo oscuro'}
          primaryTypographyProps={{ color: 'white' }}
        />
      </Box>
    </ListItemButton>
  )

  const desktopSidebar = (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isLocked) setIsHovered(false)
      }}
      sx={{
        backgroundColor: sidebarBg,
        minHeight: '100vh',
        width: isExpanded ? 240 : 80,
        transition: 'opacity .25s ease, width .25s ease, background-color .0s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        p: 2,
        zIndex: 1000,
        overflowX: 'hidden',
      }}
    >
      <List sx={{ color: 'white', py: 0, mt: 0, width: '100%' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.18)', mb: 1 }} />
        {tabs.map((tab, index) => {
          const selected = selectedIndex === index
          const item = (
            <ListItemButton
              key={tab.route}
              selected={selected}
              disableRipple
              onClick={() => handleNav(tab.route, index)}
              sx={{
                borderRadius: 2,
                mb: 1,
                height: 48,
                px: 1.45,
                width: '100%',
                bgcolor: selected ? '#fff' : 'transparent',
                '&:hover': { bgcolor: selected ? '#fff' : 'rgba(255,255,255,0.10)' },
                '&.Mui-selected': { bgcolor: '#fff !important' },
              }}
            >
              <ListItemIcon
                sx={{
                  color: selected ? 'black' : 'white',
                  minWidth: 0,
                  mr: isExpanded ? 1.5 : 0,
                }}
              >
                {tab.icon}
              </ListItemIcon>
              <Box
                sx={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? 'auto' : 0,
                  transition: 'opacity .25s ease, width .25s ease',
                }}
              >
                <ListItemText
                  primary={tab.label}
                  primaryTypographyProps={{ color: selected ? 'black' : 'white' }}
                />
              </Box>
            </ListItemButton>
          )
          return isExpanded ? (
            item
          ) : (
            <Tooltip key={tab.route} title={tab.label} placement="right">
              {item}
            </Tooltip>
          )
        })}
      </List>

      <List sx={{ color: 'white', py: 0, width: '100%' }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.18)', mb: 1 }} />
        {isExpanded ? (
          darkModeButton
        ) : (
          <Tooltip title={isDark ? 'Modo claro' : 'Modo oscuro'} placement="right">
            {darkModeButton}
          </Tooltip>
        )}
      </List>
    </Box>
  )

  if (isMobile) {
    return (
      <Paper
        sx={{
          position: 'fixed',
          backgroundColor: sidebarBg,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
        elevation={8}
      >
        <Box
          sx={{
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'nowrap',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <BottomNavigation
            showLabels={false}
            value={selectedIndex}
            sx={{
              bgcolor: 'transparent',
              display: 'inline-flex',
            }}
          >
            {tabs.map((tab, index) => (
              <BottomNavigationAction
                key={tab.route}
                value={index}
                icon={tab.icon}
                disableRipple
                onMouseDown={() => handleNav(tab.route, index)}
                onClick={() => handleNav(tab.route, index)}
                sx={{
                  color: selectedIndex === index ? 'black' : 'white',
                  '&.Mui-selected': { color: 'black', bgcolor: 'white !important' },
                }}
              />
            ))}
            <BottomNavigationAction
              value={98}
              icon={isDark ? <LightModeIcon /> : <DarkModeIcon />}
              disableRipple
              onClick={toggle}
              sx={{
                color: 'white',
                '&.Mui-selected': { color: 'black', bgcolor: 'white !important' },
              }}
            />
            <BottomNavigationAction
              value={99}
              icon={<LogoutIcon />}
              onClick={() => setSelectedIndex(99)}
              sx={{
                color: 'white',
                '&.Mui-selected': { color: 'black', bgcolor: 'white !important' },
              }}
            />
          </BottomNavigation>
        </Box>
      </Paper>
    )
  }

  return desktopSidebar
}
