import axios from 'axios'
export type ContactPayload = { name: string; email: string; subject: string; message: string }
export async function submitContact(payload: ContactPayload) {
  await axios.post('/api/contact', payload).catch(async () => { await new Promise(resolve => setTimeout(resolve, 700)) })
}
