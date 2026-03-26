'use client'

import "./globals.css"
import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider, CssBaseline } from "@mui/material"
import { ToastContainer } from 'react-toastify'
import { lightTheme, darkTheme } from "../theme/theme"
import { DarkModeProvider, useDarkMode } from '../context/ThemeContext'

function ThemedApp({ children }) {
  const { isDark } = useDarkMode()
  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <CssBaseline />
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDark ? 'dark' : 'light'}
      />
    </ThemeProvider>
  )
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <DarkModeProvider>
          <ThemedApp>{children}</ThemedApp>
        </DarkModeProvider>
      </body>
    </html>
  )
}
