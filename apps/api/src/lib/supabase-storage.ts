/**
 * Supabase Storage helper
 * Uses Supabase REST API directly (no SDK needed — compatible with Cloudflare Workers)
 */

export interface SupabaseStorageConfig {
  url: string
  serviceRoleKey: string
  bucket: string
}

export interface UploadResult {
  path: string
  publicUrl: string
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  config: SupabaseStorageConfig,
  path: string,
  body: ArrayBuffer,
  contentType: string
): Promise<UploadResult> {
  const endpoint = `${config.url}/storage/v1/object/${config.bucket}/${path}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Supabase upload failed: ${res.status} — ${error}`)
  }

  const publicUrl = getPublicUrl(config, path)
  return { path, publicUrl }
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadFile(
  config: SupabaseStorageConfig,
  path: string
): Promise<Response> {
  const endpoint = `${config.url}/storage/v1/object/${config.bucket}/${path}`

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Supabase download failed: ${res.status}`)
  }

  return res
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  config: SupabaseStorageConfig,
  path: string
): Promise<void> {
  const endpoint = `${config.url}/storage/v1/object/${config.bucket}/${path}`

  const res = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
  })

  if (!res.ok && res.status !== 404) {
    const error = await res.text()
    throw new Error(`Supabase delete failed: ${res.status} — ${error}`)
  }
}

/**
 * Create a signed URL (temporary access, 1 hour)
 */
export async function createSignedUrl(
  config: SupabaseStorageConfig,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const endpoint = `${config.url}/storage/v1/object/sign/${config.bucket}/${path}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  })

  if (!res.ok) {
    throw new Error(`Supabase signed URL failed: ${res.status}`)
  }

  const data = await res.json() as { signedURL: string }
  return `${config.url}/storage/v1${data.signedURL}`
}

/**
 * Get public URL (only works if bucket is set to public)
 */
export function getPublicUrl(config: SupabaseStorageConfig, path: string): string {
  return `${config.url}/storage/v1/object/public/${config.bucket}/${path}`
}

/**
 * Build storage config from Cloudflare Worker bindings
 */
export function getStorageConfig(env: {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_STORAGE_BUCKET: string
}): SupabaseStorageConfig {
  return {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: env.SUPABASE_STORAGE_BUCKET,
  }
}
