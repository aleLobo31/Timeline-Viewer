import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Abstraction so images can move to S3-compatible storage later. */
export interface StorageProvider {
  /** Stores a processed image and returns the public URL path (e.g. /uploads/x.webp). */
  saveImage(input: Buffer): Promise<string>;
}

export class LocalStorage implements StorageProvider {
  constructor(private dir: string) {}

  async saveImage(input: Buffer): Promise<string> {
    // Q-3: resize + compress so pages with images stay fast on mobile networks.
    const output = await sharp(input)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    await mkdir(this.dir, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await writeFile(path.join(this.dir, name), output);
    return `/uploads/${name}`;
  }
}
