/**
 * Backblaze B2 Storage helper
 * B2 provides an S3-compatible API, so we use the official AWS S3 SDK.
 * Compatible with Cloudflare Workers via the nodejs_compat flag.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface B2Config {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  region: string
}

export function getB2Client(config: B2Config): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Required for B2 S3-compatible API
    forcePathStyle: true,
  })
}

export function getB2Config(env: {
  B2_ENDPOINT: string
  B2_ACCESS_KEY_ID: string
  B2_SECRET_ACCESS_KEY: string
  B2_BUCKET_NAME: string
  B2_REGION?: string
}): B2Config {
  return {
    endpoint: env.B2_ENDPOINT,
    accessKeyId: env.B2_ACCESS_KEY_ID,
    secretAccessKey: env.B2_SECRET_ACCESS_KEY,
    bucketName: env.B2_BUCKET_NAME,
    region: env.B2_REGION ?? 'us-east-005',
  }
}

/**
 * Upload a file to Backblaze B2
 */
export async function uploadToB2(
  config: B2Config,
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<void> {
  const client = getB2Client(config)
  await client.send(new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: new Uint8Array(body),
    ContentType: contentType,
  }))
}

/**
 * Generate a presigned GET URL (for secure downloads, expires in 1 hour)
 */
export async function getPresignedDownloadUrl(
  config: B2Config,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getB2Client(config)
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.bucketName, Key: key }),
    { expiresIn }
  )
}

/**
 * Generate a presigned PUT URL (for direct client-side uploads, expires in 10 minutes)
 */
export async function getPresignedUploadUrl(
  config: B2Config,
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  const client = getB2Client(config)
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: config.bucketName, Key: key, ContentType: contentType }),
    { expiresIn }
  )
}

/**
 * Delete a file from Backblaze B2
 */
export async function deleteFromB2(
  config: B2Config,
  key: string
): Promise<void> {
  const client = getB2Client(config)
  await client.send(new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  }))
}
