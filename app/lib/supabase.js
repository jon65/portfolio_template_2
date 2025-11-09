// Supabase client for server-side operations
// Used for accessing Supabase Storage (file storage)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL is not set. Supabase Storage features will not work.')
}

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. Supabase Storage features will not work.')
}

// Create Supabase client for server-side use
// Use service role key for server-side operations (has full access)
// Use anon key for client-side operations (respects RLS policies)
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

/**
 * Get a signed URL for a file in Supabase Storage
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the file in the bucket
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string|null>} - Signed URL or null if error
 */
export async function getSignedUrl(bucketName, filePath, expiresIn = 3600) {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return null
  }

  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }

    return data?.signedUrl || null
  } catch (error) {
    console.error('Error getting signed URL:', error)
    return null
  }
}

/**
 * Get public URL for a file in Supabase Storage (if bucket is public)
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} filePath - Path to the file in the bucket
 * @returns {string|null} - Public URL or null if error
 */
export function getPublicUrl(bucketName, filePath) {
  if (!supabaseUrl) {
    console.error('Supabase URL not configured')
    return null
  }

  // Construct public URL directly (no client needed for public URLs)
  // Format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`
}

/**
 * List files in a Supabase Storage bucket
 * @param {string} bucketName - Name of the storage bucket
 * @param {string} folderPath - Optional folder path to list files from
 * @returns {Promise<Array>} - Array of file objects
 */
export async function listFiles(bucketName, folderPath = '') {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return []
  }

  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .list(folderPath)

    if (error) {
      console.error('Error listing files:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error listing files:', error)
    return []
  }
}

