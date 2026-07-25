import { Button } from '@mui/material'
import { FREIGHT_DISPATCH_URL } from '../../config/links'

export function BuyButton() {
  return (
    <Button
      href={FREIGHT_DISPATCH_URL}
      target="_blank"
      rel="noopener noreferrer"
      variant="contained"
      color="secondary"
      size="large"
      sx={{ minWidth: 220, fontSize: 17 }}
    >
      Visit Masterclass Website ↗
    </Button>
  )
}
