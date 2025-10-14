"use client"
import { createTheme } from "@mui/material/styles"

export const theme = createTheme({
  palette: {
    primary: { main: "#1976d2" },
    secondary: { main: "#f50057" },
    background: { default: "#f9fafb", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "'Quicksand', sans-serif",
  },
})
