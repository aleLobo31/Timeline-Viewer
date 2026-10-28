import { Prisma } from '@prisma/client';
import type { LoginInput, RegisterInput, UserDto } from '@timeline-viewer/shared';
import type { Db } from '../db';
import { conflict, unauthorized } from '../errors';
import { hashPassword, verifyPassword } from './passwords';

const toDto = (u: { id: string; email: string; name: string }): UserDto => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

export function authService(db: Db) {
  return {
    /** US-F1.7 */
    async register(input: RegisterInput): Promise<UserDto> {
      const exists = await db.user.findUnique({ where: { email: input.email } });
      if (exists) throw emailTaken();
      try {
        const user = await db.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash: await hashPassword(input.password),
          },
        });
        return toDto(user);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
          throw emailTaken();
        throw e;
      }
    },

    /** US-F1.8 */
    async login(input: LoginInput): Promise<UserDto> {
      const user = await db.user.findUnique({ where: { email: input.email } });
      const ok = await verifyPassword(input.password, user?.passwordHash);
      if (!user || !ok) {
        throw unauthorized('The email or the password is incorrect. Check both and try again.');
      }
      return toDto(user);
    },

    async getById(id: string): Promise<UserDto | null> {
      const user = await db.user.findUnique({ where: { id } });
      return user ? toDto(user) : null;
    },
  };
}

export type AuthService = ReturnType<typeof authService>;

const emailTaken = () =>
  conflict(
    'This email is already associated with another profile. Log in or use a different email.',
    [{ path: ['email'], message: 'This email is already associated with another profile.' }],
  );
