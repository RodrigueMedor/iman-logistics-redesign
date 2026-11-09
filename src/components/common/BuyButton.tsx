import { Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

// Opens a masterclass registration form (the Freight Dispatch Masterclass by default).
export function BuyButton({ to = '/freight-dispatch-masterclass/#register', label = 'Masterclass Registration' }: { to?: string; label?: string } = {}) {
  return (
    <Button
      component={RouterLink}
      to={to}
      variant="contained"
      color="secondary"
      size="large"
      sx={{ minWidth: 220, fontSize: 17 }}
    >
      {label}
    </Button>
  )
}
