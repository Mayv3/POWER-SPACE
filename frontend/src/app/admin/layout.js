'use client'

import { SideBar } from '../../components/SideBar'
import { powerspaceTabs } from '../../const/powerSpaceTabs'
import { Box, useMediaQuery } from '@mui/material'
import { useDarkMode } from '../../context/ThemeContext'

export default function AdminLayout({ children }) {
  const isDesktop = useMediaQuery("(min-width:900px)")
  const { isDark } = useDarkMode()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <SideBar tabs={powerspaceTabs} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: '0rem',
          marginBottom: isDesktop ? '0px' : '60px',
          marginLeft: isDesktop ? '80px' : '0px',
          width: isDesktop ? 'calc(100% - 80px)' : '100%',
          transition: 'margin 0.3s ease, background-color 0.3s ease',
          backgroundColor: isDark ? '#0d0d0d' : '#f5f5f5',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
