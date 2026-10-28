import type { MaterialType, ShareMethod } from './constants';
import type { TimelineItem } from './schemas';
import type { ValidationIssue } from './validation';

export interface UserDto {
  id: string;
  email: string;
  name: string;
}

export interface MaterialSummaryDto {
  id: string;
  type: MaterialType;
  name: string;
  description: string;
  /** URL of an image used as the card cover, or null to show a placeholder */
  coverImage: string | null;
  shared: boolean;
  updatedAt: string;
}

export interface TimelineDto {
  id: string;
  name: string;
  description: string;
  /** Explicit cover of the library card, or null (blank card) */
  coverImage: string | null;
  items: (TimelineItem & { id: string })[];
  share: ShareDto | null;
  updatedAt: string;
}

export interface ShareDto {
  token: string;
  method: ShareMethod;
  /** Path (not origin) tourists open, e.g. /s/abc123 */
  path: string;
}

/** What a tourist receives: no owner data, no share data. */
export interface PublicTimelineDto {
  name: string;
  description: string;
  items: (TimelineItem & { id: string })[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    issues?: ValidationIssue[];
  };
}
