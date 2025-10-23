"use client"
import { Box, Drawer, List, ListItem, ListItemText, AppBar, Toolbar, Typography } from "@mui/material"
import Link from "next/link"

const menuItems = [
  { label: "Inicio", path: "/" },
  { label: "Atletas", path: "/admin/atletas" },
  { label: "Intentos", path: "/admin/intentos" },
]

export default function LayoutDashboard({ children }) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 220,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 220,
            boxSizing: "border-box",
            backgroundColor: "#1e293b",
            color: "white",
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            PowerSpace
          </Typography>
        </Toolbar>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.path} component={Link} href={item.path}>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Contenido principal */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <AppBar position="fixed" sx={{ ml: 28, width: "calc(100% - 220px)" }}>
          <Toolbar>
            <Typography variant="h6">Panel de Administración</Typography>
          </Toolbar>
        </AppBar>

        <Toolbar /> {/* Espacio para la AppBar */}
        {children}
      </Box>
    </Box>
  )
}
