export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/auth'
import { saveFile, getPublicUrl } from '../../../lib/local-storage'
import path from 'path'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

export async function POST(request) {
  if (process.env.USE_LOCAL_STORAGE !== 'true') {
    return NextResponse.json(
      { error: 'Local storage upload is only available when USE_LOCAL_STORAGE=true' },
      { status: 400 }
    )
  }

  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const bucket = formData.get('bucket') || 'product-images'
    const uploadPath = formData.get('path') || ''

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Accepted: ${[...ALLOWED_TYPES].join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    const ext = path.extname(file.name) || '.jpg'
    const safeName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9._-]/g, '_') + ext
    const timestamp = Date.now()
    const storedPath = uploadPath
      ? `${uploadPath}/${timestamp}-${safeName}`
      : `${timestamp}-${safeName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await saveFile(bucket, storedPath, buffer)

    return NextResponse.json({
      success: true,
      path: storedPath,
      url: getPublicUrl(bucket, storedPath),
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
