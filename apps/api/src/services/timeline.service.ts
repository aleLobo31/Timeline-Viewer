import type { Material, Prisma, ShareLink, TimelineItem as DbItem } from '@prisma/client';
import {
  validateTimeline,
  type EventIcon,
  type ColorKey,
  type MaterialSummaryDto,
  type ShareDto,
  type TimelineDto,
  type TimelineInput,
  type TimelineItem,
} from '@timeline-viewer/shared';
import type { Db } from '../db';
import { badRequest, notFound } from '../errors';
import { z } from 'zod';

const uuid = z.string().uuid();

export const toShareDto = (s: ShareLink): ShareDto => ({
  token: s.token,
  method: s.method,
  path: `/s/${s.token}`,
});

export function toSummary(m: Material & { share?: ShareLink | null }): MaterialSummaryDto {
  return {
    id: m.id,
    type: m.type,
    name: m.name,
    description: m.description,
    coverImage: m.coverImage,
    shared: Boolean(m.share),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function itemFromDb(row: DbItem): TimelineItem & { id: string } {
  if (row.kind === 'EVENT') {
    return {
      kind: 'EVENT',
      id: row.id,
      year: row.startYear,
      month: row.month,
      day: row.day,
      icon: row.icon as EventIcon | null,
      name: row.name,
      description: row.description ?? '',
      imageUrl: row.imageUrl,
    };
  }
  return {
    kind: row.kind,
    id: row.id,
    startYear: row.startYear,
    endYear: row.endYear ?? row.startYear,
    name: row.name,
    description: row.description,
    color: row.color as ColorKey,
  };
}

function itemToDb(
  item: TimelineItem,
  position: number,
): Omit<Prisma.TimelineItemCreateManyInput, 'materialId'> {
  if (item.kind === 'EVENT') {
    return {
      kind: 'EVENT',
      position,
      name: item.name,
      description: item.description,
      startYear: item.year,
      endYear: null,
      day: item.day,
      month: item.month,
      icon: item.icon,
      imageUrl: item.imageUrl,
    };
  }
  return {
    kind: item.kind,
    position,
    name: item.name,
    description: item.description,
    startYear: item.startYear,
    endYear: item.endYear,
    color: item.color,
  };
}

/** Authoritative validation (same rules the editor runs client-side). */
export function parseTimeline(raw: unknown): TimelineInput {
  const result = validateTimeline(raw);
  if (!result.ok)
    throw badRequest(result.issues[0]?.message ?? 'The timeline is not valid.', result.issues);
  return result.data;
}

export function timelineService(db: Db) {
  /** Only timelines created by this guide are reachable; anything else is a 404. */
  async function findOwned(userId: string, id: string) {
    if (!uuid.safeParse(id).success) throw notFound('Timeline not found.');
    const material = await db.material.findFirst({
      where: { id, ownerId: userId, type: 'TIMELINE' },
      include: { items: { orderBy: { position: 'asc' } }, share: true },
    });
    if (!material) throw notFound('Timeline not found.');
    return material;
  }

  const toDto = (m: Awaited<ReturnType<typeof findOwned>>): TimelineDto => ({
    id: m.id,
    name: m.name,
    description: m.description,
    coverImage: m.coverImage,
    items: m.items.map(itemFromDb),
    share: m.share ? toShareDto(m.share) : null,
    updatedAt: m.updatedAt.toISOString(),
  });

  return {
    /** US-F1.1 */
    async create(userId: string, raw: unknown): Promise<TimelineDto> {
      const input = parseTimeline(raw);
      const created = await db.material.create({
        data: {
          ownerId: userId,
          type: 'TIMELINE',
          name: input.name,
          description: input.description,
          coverImage: input.coverImage,
          items: { create: input.items.map((item, i) => itemToDb(item, i)) },
        },
      });
      return toDto(await findOwned(userId, created.id));
    },

    async get(userId: string, id: string): Promise<TimelineDto> {
      return toDto(await findOwned(userId, id));
    },

    /** US-F1.10: the whole document is replaced atomically. */
    async update(userId: string, id: string, raw: unknown): Promise<TimelineDto> {
      await findOwned(userId, id);
      const input = parseTimeline(raw);
      await db.$transaction([
        db.timelineItem.deleteMany({ where: { materialId: id } }),
        db.material.update({
          where: { id },
          data: {
            name: input.name,
            description: input.description,
            coverImage: input.coverImage,
            items: { create: input.items.map((item, i) => itemToDb(item, i)) },
          },
        }),
      ]);
      return toDto(await findOwned(userId, id));
    },

    async remove(userId: string, id: string): Promise<void> {
      await findOwned(userId, id);
      await db.material.delete({ where: { id } });
    },
  };
}

export type TimelineService = ReturnType<typeof timelineService>;
