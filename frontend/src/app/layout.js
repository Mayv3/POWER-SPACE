'use client'

import "./globals.css"
import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider, CssBaseline } from "@mui/material"
import { ToastContainer } from 'react-toastify'
import { theme } from "../theme/theme"

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <ThemeProvider theme={theme}>
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
            theme="light"
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
