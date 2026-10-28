import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/services/passwords';
import { STRONG_PASSWORD } from './helpers';

describe('passwords (Q-2)', () => {
  it('hashes with argon2id using m=65536, t=3, p=4 (RFC 9106)', async () => {
    const stored = await hashPassword(STRONG_PASSWORD);
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$/);
    expect(stored).not.toContain(STRONG_PASSWORD);
  });

  it('salts every hash', async () => {
    const [a, b] = await Promise.all([
      hashPassword(STRONG_PASSWORD),
      hashPassword(STRONG_PASSWORD),
    ]);
    expect(a).not.toBe(b);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword(STRONG_PASSWORD);
    expect(await verifyPassword(STRONG_PASSWORD, stored)).toBe(true);
    expect(await verifyPassword('Wr0ng!Passw0rd', stored)).toBe(false);
  });

  it('rejects when there is no stored hash or it is malformed', async () => {
    expect(await verifyPassword(STRONG_PASSWORD, undefined)).toBe(false);
    expect(await verifyPassword(STRONG_PASSWORD, 'not-a-hash')).toBe(false);
  });
});
