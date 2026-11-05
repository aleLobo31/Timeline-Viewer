import path from 'node:path';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (url) => !url.includes('${'),
        'DATABASE_URL must contain the user, password and host literally; Node does not expand ${VAR} in .env files',
      ),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    WEB_ORIGIN: z
      .string()
      .default('https://localhost:5173')
      .refine((origin) => origin.startsWith('https://'), 'WEB_ORIGIN must be an https:// origin'),
    UPLOAD_DIR: z.string().default('./uploads'),
    /** PEM private key and certificate. The API only serves HTTPS (tests run in-process). */
    TLS_KEY_FILE: z.string().min(1).optional(),
    TLS_CERT_FILE: z.string().min(1).optional(),
    /** Interface to listen on. Behind a reverse proxy on the same machine use 127.0.0.1. */
    HOST: z.string().min(1).optional(),
    /**
     * Address(es) of the reverse proxy whose X-Forwarded-* headers can be believed, e.g.
     * `loopback`. Unset in development. `true` and hop counts are rejected: they would trust
     * headers sent by any client and let it spoof its IP (login rate limiter) or protocol.
     */
    TRUST_PROXY: z
      .string()
      .min(1)
      .refine(
        (value) => !/^(true|false|\d+)$/i.test(value.trim()),
        'TRUST_PROXY must name the proxy address(es), e.g. "loopback" or "10.0.0.0/8"',
      )
      .optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'test') return;
    for (const key of ['TLS_KEY_FILE', 'TLS_CERT_FILE'] as const) {
      if (env[key]) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required: the API only serves HTTPS`,
      });
    }
  });

export type Config = z.infer<typeof envSchema> & {
  uploadDirAbs: string;
  isProd: boolean;
  isTest: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  const cfg = parsed.data;
  return {
    ...cfg,
    uploadDirAbs: path.resolve(cfg.UPLOAD_DIR),
    isProd: cfg.NODE_ENV === 'production',
    isTest: cfg.NODE_ENV === 'test',
  };
}
