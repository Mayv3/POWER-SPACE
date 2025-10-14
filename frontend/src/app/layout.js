'use client'

import "./globals.css"
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material"
import { theme } from "../theme/theme"
import { SideBar } from "../components/SideBar"
import { powerspaceTabs } from "../const/powerSpaceTabs"

export default function RootLayout({ children }) {
  const isDesktop = useMediaQuery("(min-width:900px)")

  return (
    <html lang="es">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div
            style={{
              display: 'flex',
              minHeight: '100vh',
              width: '100%',
            }}
          >
            <SideBar tabs={powerspaceTabs} />
            <main
              style={{
                flexGrow: 1,
                padding: '1rem',
                marginBottom: isDesktop ? '0px' : '60px',
                marginLeft: isDesktop ? '80px' : '0px',
                width: isDesktop ? 'calc(100% - 80px)' : '100%',
                transition: 'margin 0.3s ease',
              }}
            >
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
