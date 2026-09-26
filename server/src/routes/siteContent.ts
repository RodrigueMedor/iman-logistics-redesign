import { Router } from 'express'
import { requireRole, staff, superAdminOnly } from '../lib/auth'
import { HttpError, parse } from '../lib/http'
import { publicClient } from '../lib/supabase'
import { imageUpload, siteContentInput } from '../schemas'

// Website content (CMS). The public site reads published sections; super
// admins manage all sections and upload images.
export const siteContentRoutes = Router()
export const siteContentAdminRoutes = Router()

siteContentRoutes.get('/site-content', async (_req, res) => {
  const { data, error } = await publicClient().from('site_content').select('*').eq('published', true).order('page').order('sort_order')
  if (error) throw error
  res.set('Cache-Control', 'public, max-age=60').json(data)
})

siteContentAdminRoutes.use(requireRole(superAdminOnly))

siteContentAdminRoutes.get('/', async (req, res) => {
  const { data, error } = await staff(req).db.from('site_content').select('*').order('page').order('sort_order')
  if (error) throw error
  res.json(data)
})

siteContentAdminRoutes.post('/', async (req, res) => {
  const { data, error } = await staff(req).db.from('site_content').insert(parse(siteContentInput, req.body)).select('*').single()
  if (error?.code === '23505') throw new HttpError(409, 'That page already has a section with this key.')
  if (error) throw error
  res.status(201).json(data)
})

siteContentAdminRoutes.put('/:id', async (req, res) => {
  const { data, error } = await staff(req).db.from('site_content').update({ ...parse(siteContentInput, req.body), updated_at: new Date().toISOString() }).eq('id', req.params.id).select('*').maybeSingle()
  if (error?.code === '23505') throw new HttpError(409, 'That page already has a section with this key.')
  if (error) throw error
  if (!data) throw new HttpError(404, 'Content section not found.')
  res.json(data)
})

siteContentAdminRoutes.delete('/:id', async (req, res) => {
  const { count, error } = await staff(req).db.from('site_content').delete({ count: 'exact' }).eq('id', req.params.id)
  if (error) throw error
  if (!count) throw new HttpError(404, 'Content section not found.')
  res.status(204).end()
})

const imageExtensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' }

// Returns a one-time token for uploading an image to the public website-media bucket.
siteContentAdminRoutes.post('/image-uploads', async (req, res) => {
  const file = parse(imageUpload, req.body)
  const path = `website/${crypto.randomUUID()}.${imageExtensions[file.type]}`
  const { db } = staff(req)
  const { data, error } = await db.storage.from('website-media').createSignedUploadUrl(path)
  if (error) throw error
  res.status(201).json({ path, token: data.token, publicUrl: db.storage.from('website-media').getPublicUrl(path).data.publicUrl })
})
