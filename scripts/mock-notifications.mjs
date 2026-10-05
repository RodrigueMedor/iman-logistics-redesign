// Local stand-in for the Resend and Twilio APIs, for end-to-end tests only.
// Captures every email/SMS request so tests can inspect what the API sent.
//
//   node scripts/mock-notifications.mjs            (listens on :4010)
//   RESEND_BASE_URL=http://localhost:4010/resend
//   TWILIO_API_BASE_URL=http://localhost:4010/twilio
//   GET  http://localhost:4010/captured   → everything received
//   DELETE http://localhost:4010/captured → clear
import http from 'node:http'

const port = Number(process.env.MOCK_NOTIFICATIONS_PORT || 4010)
let captured = []
// Unique per mock run, like real Twilio SIDs.
const started = Date.now().toString(36)

const readBody = request => new Promise(resolve => {
  let body = ''
  request.on('data', chunk => { body += chunk })
  request.on('end', () => resolve(body))
})

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`)
  const send = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)) }
  if (url.pathname === '/captured') {
    if (request.method === 'DELETE') captured = []
    return send(200, captured)
  }
  const body = await readBody(request)
  if (url.pathname === '/resend/emails' && request.method === 'POST') {
    const id = `email_${captured.length + 1}`
    captured.push({ channel: 'email', id, authorization: request.headers.authorization, ...JSON.parse(body) })
    return send(200, { id })
  }
  if (url.pathname.startsWith('/twilio/2010-04-01/Accounts/') && url.pathname.endsWith('/Messages.json') && request.method === 'POST') {
    const form = Object.fromEntries(new URLSearchParams(body))
    // Numbers ending in 0161 behave like a recipient who replied STOP.
    if (form.To?.endsWith('0161')) return send(400, { code: 21610, message: 'Attempt to send to unsubscribed recipient', status: 400 })
    const sid = `SM${started}${captured.length + 1}`
    captured.push({ channel: 'sms', sid, authorization: request.headers.authorization, to: form.To, from: form.From, messagingServiceSid: form.MessagingServiceSid, statusCallback: form.StatusCallback, body: form.Body })
    return send(201, { sid, status: 'queued' })
  }
  send(404, { error: 'not mocked' })
}).listen(port, () => console.log(`Mock Resend/Twilio listening on http://localhost:${port}`))
