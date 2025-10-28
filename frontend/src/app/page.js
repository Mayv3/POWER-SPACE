'use client'

import { useRouter } from 'next/navigation'
import { Box, Card, CardContent, Typography, Grid } from "@mui/material"
import PeopleIcon from '@mui/icons-material/People'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import BuildIcon from '@mui/icons-material/Build'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

export default function HomePage() {
  const router = useRouter()

  const menuItems = [
    {
      title: 'Atletas',
      icon: <PeopleIcon sx={{ fontSize: 60 }} />,
      color: '#1976d2',
      route: '/admin/atletas'
    },
    {
      title: 'Intentos',
      icon: <FitnessCenterIcon sx={{ fontSize: 60 }} />,
      color: '#388e3c',
      route: '/admin/intentos'
    },
    {
      title: 'Cargadores',
      icon: <BuildIcon sx={{ fontSize: 60 }} />,
      color: '#f57c00',
      route: '/admin/cargadores'
    },
    {
      title: 'Resultados',
      icon: <EmojiEventsIcon sx={{ fontSize: 60 }} />,
      color: '#d32f2f',
      route: '/admin/resultados'
    }
  ]

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4,
      backgroundColor: '#f5f5f5'
    }}>
      <Box sx={{ maxWidth: 900, width: '100%' }}>
        <Typography variant="h3" fontWeight="bold" textAlign="center" mb={8}>
          Power Space
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {menuItems.map((item, index) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={6}
              key={index}
              display="flex"
              justifyContent="center"
            >
              <Card
                onClick={() => router.push(item.route)}
                className='aspect-square'
                sx={{
                  width: '100%',
                  maxWidth: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', width: '100%' }}>
                  <Box sx={{ color: item.color, mb: 3 }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: item.color }}>
                    {item.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

      </Box>
    </Box>
  )
}
