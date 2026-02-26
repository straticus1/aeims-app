import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 16

/**
 * Derives an encryption key from the master secret
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Get the encryption secret from environment
 */
function getEncryptionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is required for encryption')
  }
  return secret
}

/**
 * Encrypt sensitive data (like API keys and credentials)
 * Returns base64-encoded string with format: salt.iv.authTag.encryptedData
 */
export function encrypt(plaintext: string): string {
  const secret = getEncryptionSecret()

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)

  // Derive key from secret and salt
  const key = deriveKey(secret, salt)

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv)

  // Encrypt data
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  // Get authentication tag
  const authTag = cipher.getAuthTag()

  // Combine all parts and encode as base64
  const combined = Buffer.concat([salt, iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt sensitive data
 * Expects base64-encoded string with format: salt.iv.authTag.encryptedData
 */
export function decrypt(encryptedData: string): string {
  const secret = getEncryptionSecret()

  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  )
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  // Derive key from secret and salt
  const key = deriveKey(secret, salt)

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  // Decrypt data
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Encrypt JSON object to string
 */
export function encryptJSON<T>(data: T): string {
  return encrypt(JSON.stringify(data))
}

/**
 * Decrypt string to JSON object
 */
export function decryptJSON<T>(encryptedData: string): T {
  return JSON.parse(decrypt(encryptedData))
}
