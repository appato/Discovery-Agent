import { describe, it, expect, afterEach, vi } from 'vitest';


const { mockUpload } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));
import { SupabaseImageStorage, createImageStorage } from '@/lib/storage/image-storage';



function createMinimalPng(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde,
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
    0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00,
    0x00, 0x03, 0x00, 0x01, 0x0e, 0x45, 0xab, 0x52,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82,
  ]);
}



describe('createImageStorage', () => {
  it('always uses Supabase Storage', () => {
    expect(createImageStorage()).toBeInstanceOf(SupabaseImageStorage);
  });
});

describe('SupabaseImageStorage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uploads image to client-uploads bucket and returns correct metadata', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'test-session-1/reference.png' }, error: null });

    const storage = new SupabaseImageStorage();
    const buffer = createMinimalPng();
    const sessionId = 'test-session-1';
    const filename = 'reference.png';
    const mimeType = 'image/png';

    const metadata = await storage.storeImage(buffer, sessionId, filename, mimeType);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith(
      `${sessionId}/${filename}`,
      buffer,
      { contentType: mimeType, upsert: false }
    );

    expect(metadata.id).toMatch(/^img-/);
    expect(metadata.originalName).toBe(filename);
    expect(metadata.mimeType).toBe(mimeType);
    expect(metadata.storedPath).toBe(`${sessionId}/${filename}`);
    expect(new Date(metadata.uploadedAt).toISOString()).toBe(metadata.uploadedAt);
  });

  it('returns correct storedPath with different filenames', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'abc-123/design.png' }, error: null });

    const storage = new SupabaseImageStorage();
    const metadata = await storage.storeImage(createMinimalPng(), 'abc-123', 'design.png', 'image/png');

    expect(metadata.storedPath).toBe('abc-123/design.png');
  });
});
