import { randomBytes } from 'node:crypto';
import type { PublicTimelineDto, ShareDto, ShareMethod } from '@timeline-viewer/shared';
import { z } from 'zod';
import type { Db } from '../db';
import { notFound } from '../errors';
import { itemFromDb, toShareDto } from './timeline.service';

const uuid = z.string().uuid();
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

/** 128 bits of randomness, URL safe (22 chars). */
export const newToken = () => randomBytes(16).toString('base64url');

export function shareService(db: Db) {
  return {
    /**
     * US-F1.5: share one or more of the guide's materials. Re-sharing keeps the
     * existing token (so printed QRs keep working) and only updates the method.
     */
    async share(
      userId: string,
      materialIds: string[],
      method: ShareMethod,
    ): Promise<{ materialId: string; share: ShareDto }[]> {
      const ids = [...new Set(materialIds)];
      if (ids.some((id) => !uuid.safeParse(id).success)) throw notFound('Timeline not found.');
      const owned = await db.material.findMany({
        where: { id: { in: ids }, ownerId: userId },
        select: { id: true },
      });
      if (owned.length !== ids.length) throw notFound('Timeline not found.');

      return db
        .$transaction(
          ids.map((id) =>
            db.shareLink.upsert({
              where: { materialId: id },
              create: { materialId: id, method, token: newToken() },
              update: { method },
            }),
          ),
        )
        .then((links) => links.map((l) => ({ materialId: l.materialId, share: toShareDto(l) })));
    },

    async unshare(userId: string, materialId: string): Promise<void> {
      if (!uuid.safeParse(materialId).success) throw notFound('Timeline not found.');
      const material = await db.material.findFirst({ where: { id: materialId, ownerId: userId } });
      if (!material) throw notFound('Timeline not found.');
      await db.shareLink.deleteMany({ where: { materialId } });
    },

    /** Tourist access: only what a guide explicitly shared, read-only, no owner data. */
    async getPublicTimeline(token: string): Promise<PublicTimelineDto> {
      if (!TOKEN_RE.test(token)) throw notFound('This timeline is not available.');
      const link = await db.shareLink.findUnique({
        where: { token },
        include: { material: { include: { items: { orderBy: { position: 'asc' } } } } },
      });
      if (!link || link.material.type !== 'TIMELINE')
        throw notFound('This timeline is not available.');
      return {
        name: link.material.name,
        description: link.material.description,
        items: link.material.items.map(itemFromDb),
      };
    },
  };
}

export type ShareService = ReturnType<typeof shareService>;
