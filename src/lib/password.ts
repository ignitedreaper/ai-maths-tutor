/**
 * Password Hashing & Verification Utility
 * Implements Argon2id with automatic fallback to bcrypt.
 */

let argon2: typeof import('@node-rs/argon2') | null = null;
let bcrypt: typeof import('bcryptjs') | null = null;

try {
  argon2 = require('@node-rs/argon2');
} catch (e) {
  // Argon2 native module unavailable, fallback to bcryptjs
}

try {
  bcrypt = require('bcryptjs');
} catch (e) {
  // bcryptjs unavailable
}

/**
 * Hash a plaintext password securely using Argon2id (or bcrypt if Argon2 is unavailable).
 */
export async function hashPassword(password: string): Promise<string> {
  if (argon2) {
    try {
      // Memory-hard Argon2id parameters
      return await argon2.hash(password, {
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });
    } catch (err) {
      console.warn('Argon2 hashing encountered an issue, using bcrypt fallback:', err);
    }
  }

  if (bcrypt) {
    return await bcrypt.hash(password, 12);
  }

  throw new Error('No compatible password hashing library available.');
}

/**
 * Verify a plaintext password against a stored hash.
 * Automatically handles Argon2id and bcrypt hash formats.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) {
    return false;
  }

  if (storedHash.startsWith('$argon2') && argon2) {
    try {
      return await argon2.verify(storedHash, password);
    } catch {
      return false;
    }
  }

  if (storedHash.startsWith('$2') && bcrypt) {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }

  // Fallback try bcrypt then argon2 if format isn't immediately obvious
  if (bcrypt) {
    try {
      const match = await bcrypt.compare(password, storedHash);
      if (match) return true;
    } catch {}
  }

  if (argon2) {
    try {
      return await argon2.verify(storedHash, password);
    } catch {}
  }

  return false;
}
