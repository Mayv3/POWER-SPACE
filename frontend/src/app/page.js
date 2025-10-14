import { Button, Card, CardContent, Typography } from "@mui/material"

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-100">
      <Card className="w-full max-w-md shadow-md">
        <CardContent className="text-center">
          <Typography variant="h4" gutterBottom>
            🏋️‍♂️ Power Space Frontend
          </Typography>
          <Button variant="contained" color="primary">
            Empezar
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
