export interface PasswordRule {
  id: string;
  message: string;
  test: (password: string) => boolean;
}

/** US-F1.7 password policy. Shared so the UI can show live feedback. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    message: 'Password must have at least 8 characters.',
    test: (p) => p.length >= 8,
  },
  {
    id: 'letter',
    message: 'Password must contain at least 1 letter.',
    test: (p) => /\p{L}/u.test(p),
  },
  {
    id: 'upper',
    message: 'Password must contain at least 1 capital letter.',
    test: (p) => /\p{Lu}/u.test(p),
  },
  {
    id: 'number',
    message: 'Password must contain at least 1 number.',
    test: (p) => /\d/.test(p),
  },
  {
    id: 'special',
    message: 'Password must contain at least 1 special character (e.g. ! @ # $ %).',
    test: (p) => /[^\p{L}\p{N}\s]/u.test(p),
  },
];

/** Returns the messages of every rule the password does not satisfy. */
export function checkPassword(password: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.message);
}
