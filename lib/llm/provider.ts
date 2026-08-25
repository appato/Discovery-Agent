import { createOpenAI, openai } from '@ai-sdk/openai';

export const digitalocean = createOpenAI({
  baseURL: 'https://inference.do-ai.run/v1',
  apiKey: process.env.DIGITALOCEAN_TOKEN,
});

export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'Appato Business Idea Agent',
  },
});

export const DO_MODEL = 'deepseek-v4-pro';
export const BUSINESS_IDEA_MODEL = 'openai/gpt-5.6-sol';

export { openai };
