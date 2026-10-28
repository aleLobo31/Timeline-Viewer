import { hash, verify, type Algorithm, type Options } from '@node-rs/argon2';

/** `Algorithm.Argon2id` (a declared const enum, which isolatedModules can't import by value). */
const ARGON2ID: Algorithm = 2;

/**
 * Q-2: passwords are only ever stored as argon2id hashes.
 * RFC 9106, second recommended option: m = 64 MiB, t = 3, p = 4.
 */
export const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 65536, // KiB
  timeCost: 3,
  parallelism: 4,
} as const satisfies Options;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifies a password. When there is no user (hash undefined) a dummy hash is
 * checked so that response time doesn't reveal whether the email exists.
 * The parameters used to verify are read from the stored hash itself.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | undefined,
): Promise<boolean> {
  if (!storedHash) {
    dummyHash ??= hash('timeline-viewer-dummy-password', ARGON2_OPTIONS);
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  return verify(storedHash, password).catch(() => false);
}
