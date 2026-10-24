import { z } from 'zod';
import { COLOR_KEYS, EVENT_ICONS, YEAR_MAX, YEAR_MIN } from './constants';
import { checkPassword } from './password';

/** Number of whitespace separated words of a text. */
export const countWords = (text: string): number => {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const wordLimit = (label: string, maxWords: number) =>
  [
    (value: string) => countWords(value) <= maxWords,
    { message: `${label} must have at most ${maxWords} words.` },
  ] as const;

const required = (label: string, max: number, maxWords = Infinity) =>
  z
    .string({
      required_error: `${label} is required.`,
      invalid_type_error: `${label} is required.`,
    })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must have at most ${max} characters.`)
    .refine(...wordLimit(label, maxWords));

const optionalText = (label: string, max: number, maxWords = Infinity) =>
  z
    .string()
    .trim()
    .max(max, `${label} must have at most ${max} characters.`)
    .refine(...wordLimit(label, maxWords))
    .nullish()
    .transform((v) => (v ? v : null));

// Only images uploaded through the API are accepted (no arbitrary URLs).
const uploadedImage = z
  .string()
  .regex(/^\/uploads\/[A-Za-z0-9-]+\.webp$/, 'The image is not valid. Upload it again.')
  .nullish()
  .transform((v) => (v ? v : null));

const year = (label: string) =>
  z
    .number({
      required_error: `${label} is required.`,
      invalid_type_error: `${label} must be a number.`,
    })
    .int(`${label} must be a whole number.`)
    .min(YEAR_MIN, `${label} must be ${YEAR_MIN} or later.`)
    .max(YEAR_MAX, `${label} must be ${YEAR_MAX} or earlier.`);

const optionalInt = (label: string, min: number, max: number) =>
  z
    .number({ invalid_type_error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(min, `${label} must be between ${min} and ${max}.`)
    .max(max, `${label} must be between ${min} and ${max}.`)
    .nullish()
    .transform((v) => (v === undefined ? null : v));

export const NAME_MAX = 120;
/** Character cap kept as a safety net; item descriptions are limited in words. */
export const DESCRIPTION_MAX = 5000;
/** Characters allowed in the description of a timeline (US-F1.1). */
export const TIMELINE_DESCRIPTION_MAX_CHARS = 100;
/** Words allowed in the description of an event, process or period. */
export const ITEM_DESCRIPTION_MAX_WORDS = 300;

// ---------------------------------------------------------------- items (F1.2-F1.4)

export const eventItemSchema = z.object({
  kind: z.literal('EVENT'),
  id: z.string().optional(),
  year: year('Year'),
  month: optionalInt('Month', 1, 12),
  day: optionalInt('Day', 1, 31),
  /** Optional: an event may have no icon. */
  icon: z
    .enum(EVENT_ICONS, {
      errorMap: () => ({ message: 'Select a valid icon or none.' }),
    })
    .nullish()
    .transform((v) => v ?? null),
  name: required('Event name', NAME_MAX),
  description: required('Event description', DESCRIPTION_MAX, ITEM_DESCRIPTION_MAX_WORDS),
  imageUrl: uploadedImage,
});

const colorField = z.enum(COLOR_KEYS, {
  errorMap: () => ({ message: 'Select a color from the list.' }),
});

export const processItemSchema = z.object({
  kind: z.literal('PROCESS'),
  id: z.string().optional(),
  startYear: year('Start year'),
  endYear: year('End year'),
  name: required('Process name', NAME_MAX),
  description: optionalText('Process description', DESCRIPTION_MAX, ITEM_DESCRIPTION_MAX_WORDS),
  color: colorField,
});

export const periodItemSchema = z.object({
  kind: z.literal('PERIOD'),
  id: z.string().optional(),
  startYear: year('Start year'),
  endYear: year('End year'),
  name: required('Period name', NAME_MAX),
  description: optionalText('Period description', DESCRIPTION_MAX, ITEM_DESCRIPTION_MAX_WORDS),
  color: colorField,
});

export const timelineItemSchema = z.discriminatedUnion('kind', [
  eventItemSchema,
  processItemSchema,
  periodItemSchema,
]);

export type EventItem = z.output<typeof eventItemSchema>;
export type ProcessItem = z.output<typeof processItemSchema>;
export type PeriodItem = z.output<typeof periodItemSchema>;
export type TimelineItem = z.output<typeof timelineItemSchema>;
export type RangeItem = ProcessItem | PeriodItem;

// ---------------------------------------------------------------- timeline (F1.1)

export const timelineInputSchema = z.object({
  name: required('Timeline name', NAME_MAX),
  description: required('Description', TIMELINE_DESCRIPTION_MAX_CHARS),
  /** Optional cover shown in the library; never derived from the items. */
  coverImage: uploadedImage,
  items: z.array(timelineItemSchema),
});
export type TimelineInput = z.output<typeof timelineInputSchema>;

// ---------------------------------------------------------------- auth (F1.7, F1.8)

export const emailSchema = z
  .string({ required_error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.');

export const registerSchema = z.object({
  email: emailSchema,
  name: required('Name', NAME_MAX),
  password: z
    .string({ required_error: 'Password is required.' })
    .max(200, 'Password is too long.')
    .superRefine((value, ctx) => {
      for (const message of checkPassword(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    }),
});
export type RegisterInput = z.output<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required.' }).min(1, 'Password is required.'),
});
export type LoginInput = z.output<typeof loginSchema>;

export const shareRequestSchema = z.object({
  method: z.enum(['LINK', 'QR']),
});
