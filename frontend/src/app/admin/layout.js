'use client'

import { FloatingTabs } from '../../components/FloatingTabs'
import { powerspaceTabs } from '../../const/powerSpaceTabs'
import { Box } from '@mui/material'
import { useDarkMode } from '../../context/ThemeContext'

export default function AdminLayout({ children }) {
  const { isDark } = useDarkMode()

  return (
    <Box sx={{ display: 'flex', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: '0rem',
          height: '100dvh',
          width: '100%',
          overflow: 'hidden',
          transition: 'background-color 0.3s ease',
          backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
        }}
      >
        {children}
      </Box>
      <FloatingTabs tabs={powerspaceTabs} />
    </Box>
  )
}
