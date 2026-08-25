import { randomUUID } from 'crypto';
import { getSupabaseClient } from '../supabase/client';

export interface ImageMetadata {
  id: string;
  originalName: string;
  storedPath: string;
  mimeType: string;
  uploadedAt: string;
}

export interface ImageStorage {
  storeImage(
    buffer: Buffer,
    sessionId: string,
    filename: string,
    mimeType: string,
  ): Promise<ImageMetadata>;
}

export function createImageStorage(): ImageStorage {
  return new SupabaseImageStorage();
}

const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'client-uploads';

export class SupabaseImageStorage implements ImageStorage {
  async storeImage(
    buffer: Buffer,
    sessionId: string,
    filename: string,
    mimeType: string,
  ): Promise<ImageMetadata> {
    const client = getSupabaseClient();
    const storagePath = `${sessionId}/${filename}`;
    const id = `img-${randomUUID().slice(0, 8)}`;

    const { error } = await client.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return {
      id,
      originalName: filename,
      storedPath: storagePath,
      mimeType,
      uploadedAt: new Date().toISOString(),
    };
  }
}
