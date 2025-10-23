'use client'

import "./globals.css"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { theme } from "../theme/theme"

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
