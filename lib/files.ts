import { ensurePolyfills } from './polyfills';

const SUPPORTED_DOC_MIMES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/pdf',
];

const SUPPORTED_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
];

export function isSupportedFile(mimeType: string): boolean {
  return SUPPORTED_DOC_MIMES.includes(mimeType) || SUPPORTED_IMAGE_MIMES.includes(mimeType);
}

export function isImageFile(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIMES.includes(mimeType);
}

export async function extractText(buffer: Buffer, _filename: string, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    await ensurePolyfills();
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }

  return buffer.toString('utf-8');
}

