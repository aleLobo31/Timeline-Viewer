import { hash, verify } from '@node-rs/argon2';

/** Q-2: passwords are only ever stored as argon2id hashes (library default). */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifies a password. When there is no user (hash undefined) a dummy hash is
 * checked so that response time doesn't reveal whether the email exists.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | undefined,
): Promise<boolean> {
  if (!storedHash) {
    dummyHash ??= hash('timeline-viewer-dummy-password');
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  return verify(storedHash, password).catch(() => false);
}
