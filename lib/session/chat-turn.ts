import { extractText, isImageFile, isSupportedFile } from '@/lib/files';
import { createImageStorage, type ImageMetadata } from '@/lib/storage/image-storage';
import { extractUrls, fetchWebsiteContent } from '@/lib/website';

export interface PreparedFetchedWebsite {
  url: string;
  title: string;
  metaDescription: string;
  extractedText: string;
  turnNumber: number;
  fetchedAt: string;
}

export interface PreparedChatTurn {
  userMessage: {
    turnNumber: number;
    role: 'user';
    content: string;
    contentType: 'text' | 'file_upload' | 'image_upload';
    timestamp: string;
  };
  llmMessages: Array<{
    role: string;
    content: string | Array<{
      type: string;
      text?: string;
      image?: string;
      mimeType?: string;
    }>;
  }>;
  uploadedImageMeta: ImageMetadata | null;
  fetchedWebsitesData: PreparedFetchedWebsite[];
}

export class ChatTurnInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatTurnInputError';
  }
}

export async function prepareChatTurn(args: {
  request: Request;
  sessionId: string;
  turnNumber: number;
  chatHistory: Array<{ role: string; content: unknown }>;
}): Promise<PreparedChatTurn> {
  const { request, sessionId, turnNumber, chatHistory } = args;
  const now = new Date().toISOString();
  const contentType = request.headers.get('content-type') || '';
  let message = '';
  let extractedFileText: string | null = null;
  let uploadedFileName: string | null = null;
  let uploadedImageMeta: ImageMetadata | null = null;
  let imageBase64: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const rawMessage = formData.get('message');
    message = typeof rawMessage === 'string' ? rawMessage : '';
    const file = formData.get('file') as File | null;

    if (file && file.size > 0) {
      uploadedFileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());

      if (!isSupportedFile(file.type)) {
        throw new ChatTurnInputError(`Unsupported file type: ${uploadedFileName}`);
      }

      if (isImageFile(file.type)) {
        imageBase64 = buffer.toString('base64');
        const imageStorage = createImageStorage();
        uploadedImageMeta = await imageStorage.storeImage(buffer, sessionId, file.name, file.type);
      } else {
        extractedFileText = await extractText(buffer, file.name, file.type);
      }
    }
  } else {
    const body = await request.json();
    message = typeof body.message === 'string' ? body.message : '';
  }

  const fetchedWebsitesData: PreparedFetchedWebsite[] = [];
  let websiteContext = '';

  if (message) {
    const urls = extractUrls(message);
    for (const url of urls) {
      const content = await fetchWebsiteContent(url);
      if (content) {
        fetchedWebsitesData.push({
          url,
          title: content.title,
          metaDescription: content.metaDescription,
          extractedText: content.visibleText,
          turnNumber,
          fetchedAt: new Date().toISOString(),
        });
        websiteContext += `\n\n[Website: ${url}]\nTitle: ${content.title}\nDescription: ${content.metaDescription}\nContent: ${content.visibleText}\n[End of ${url}]`;
      }
    }
  }

  if (websiteContext) {
    websiteContext = `\n\nThe client shared the following website links. Their content has been fetched and is provided below for context:${websiteContext}`;
  }

  const userMessage = {
    turnNumber,
    role: 'user' as const,
    content: uploadedFileName
      ? uploadedImageMeta
        ? `[Image uploaded: ${uploadedFileName}]` + (message ? `\n\nUser message: ${message}` : '')
        : `[File uploaded: ${uploadedFileName}]\n\n${extractedFileText}` + (message ? `\n\nUser message: ${message}` : '')
      : message,
    contentType: uploadedFileName
      ? uploadedImageMeta ? 'image_upload' as const : 'file_upload' as const
      : 'text' as const,
    timestamp: now,
  };

  const llmMessages: PreparedChatTurn['llmMessages'] = chatHistory.map((history) => ({
    role: history.role,
    content: typeof history.content === 'string' ? history.content : String(history.content),
  }));

  if (uploadedImageMeta && imageBase64) {
    const parts: Array<{ type: string; text?: string; image?: string; mimeType?: string }> = [];
    if (message) {
      parts.push({ type: 'text', text: `The client uploaded an image called "${uploadedFileName}" and said: ${message}${websiteContext}` });
    } else {
      parts.push({ type: 'text', text: `The client uploaded an image called "${uploadedFileName}". Please describe what you see and ask relevant discovery questions about it.${websiteContext}` });
    }
    parts.push({ type: 'image', image: imageBase64, mimeType: uploadedImageMeta.mimeType });
    llmMessages.push({ role: 'user', content: parts });
  } else {
    const llmUserContent = uploadedFileName
      ? `The client uploaded a file called "${uploadedFileName}". Here is the content:\n\n---\n${extractedFileText}\n---` + (message ? `\n\nThe client also said: ${message}` : '')
      : message;
    llmMessages.push({ role: 'user', content: llmUserContent + websiteContext });
  }

  return {
    userMessage,
    llmMessages,
    uploadedImageMeta,
    fetchedWebsitesData,
  };
}
