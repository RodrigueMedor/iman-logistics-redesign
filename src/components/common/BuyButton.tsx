import { Button } from '@mui/material'

const paymentUrl = 'https://connect.intuit.com/portal/app/CommerceNetwork/view/scs-v1-8a63475d17de414ba676cdc3733097677a33ef5894274c4bba580f0f816906c5534ba4c2746e428da05144e4ee80d72f?locale=EN_US&cta=paylinkbuybutton'

export function BuyButton() {
  return <Button href={paymentUrl} target="_blank" rel="noreferrer" variant="contained" color="secondary" size="large" sx={{ minWidth: 160, fontSize: 18 }}>Buy Now</Button>
}
