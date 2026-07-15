import { NextRequest, NextResponse } from 'next/server';
import { extractText, isSupportedFile } from '@/lib/files';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!isSupportedFile(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.name}` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractText(buffer, file.name, file.type);

  return NextResponse.json({ text });
}
