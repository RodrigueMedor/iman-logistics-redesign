import { Alert, Box, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material'
import PolicyIcon from '@mui/icons-material/Policy'
import { expectedSignatureName, FREIGHT_BROKER_POLICY_CHECKBOX, FREIGHT_BROKER_POLICY_TEXT, normalizePersonName } from './program'

// Adapted from the school's DispatcherPolicyAgreement.
export function PolicyAgreement({ firstName, lastName, accepted, signature, onAcceptedChange, onSignatureChange }: {
  firstName: string
  lastName: string
  accepted: boolean
  signature: string
  onAcceptedChange: (accepted: boolean) => void
  onSignatureChange: (signature: string) => void
}) {
  const expectedName = expectedSignatureName(firstName, lastName)
  const isSignatureValid = Boolean(expectedName) && normalizePersonName(signature) === normalizePersonName(expectedName)

  return (
    <Stack spacing={2.5} sx={{ textAlign: 'left' }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <PolicyIcon color="primary" />
        <Typography variant="h6" fontWeight={800}>Required Payment Policy</Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3, bgcolor: '#fff9e6', borderColor: '#ffe082', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} color="#b78103" gutterBottom>FREIGHT DISPATCH MASTERCLASS NON-REFUNDABLE POLICY</Typography>
        <Typography variant="body1" fontWeight={600} color="#3e2723" sx={{ lineHeight: 1.6 }}>{FREIGHT_BROKER_POLICY_TEXT}</Typography>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #ffe57f' }}>
          <Typography variant="caption" color="text.secondary">
            Payments are securely processed by Stripe. Once confirmed, tuition credits may be applied toward any future scheduled Freight Dispatch Masterclass session.
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ p: 2, border: '2px solid', borderColor: accepted ? 'success.main' : 'divider', borderRadius: 2, bgcolor: accepted ? '#f0fdf4' : 'transparent', transition: 'border-color 0.2s, background-color 0.2s' }}>
        <FormControlLabel
          control={<Checkbox checked={accepted} onChange={event => onAcceptedChange(event.target.checked)} color="success" required />}
          label={<Typography variant="body2" fontWeight={700}>{FREIGHT_BROKER_POLICY_CHECKBOX}</Typography>}
        />
      </Box>

      <TextField
        fullWidth
        label="Electronic signature (full legal name)"
        value={signature}
        onChange={event => onSignatureChange(event.target.value)}
        required
        error={Boolean(signature && !isSignatureValid)}
        helperText={expectedName ? `Type "${expectedName}" exactly as it appears on your registration form.` : 'Type your full legal name to complete signature.'}
      />

      <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
        Credit card and electronic payments are processed over an encrypted connection by Stripe. Iman Logistics does not store your full payment card number.
      </Alert>
    </Stack>
  )
}
