import { Button } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

// Opens the Freight Broker Masterclass registration form.
export function BuyButton() {
  return (
    <Button
      component={RouterLink}
      to="/freight-broker-masterclass/#register"
      variant="contained"
      color="secondary"
      size="large"
      sx={{ minWidth: 220, fontSize: 17 }}
    >
      Masterclass Registration
    </Button>
  )
}
