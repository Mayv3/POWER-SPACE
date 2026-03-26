"use client"
import { createTheme } from "@mui/material/styles"

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: "#1976d2" },
    secondary: { main: "#f50057" },
    background: { default: "#f9fafb", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: "'Quicksand', sans-serif" },
})

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: "#1976d2" },
    secondary: { main: "#f50057" },
    background: { default: "#0d0d0d", paper: "#141414" },
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: "'Quicksand', sans-serif" },
})

export const theme = lightTheme
