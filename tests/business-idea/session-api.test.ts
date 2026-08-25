import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BusinessIdeaSessionStore } from '@/lib/business-idea/store';

const TEST_SESSIONS_DIR = path.join(process.cwd(), 'test-sessions-business-session-api');

async function getSession(sessionId: string) {
  const { GET } = await import('@/app/api/business-ideas/session/[id]/route');
  return GET(new Request(`http://localhost:3000/api/business-ideas/session/${sessionId}`), {
    params: Promise.resolve({ id: sessionId }),
  });
}

async function patchSession(sessionId: string, action: string) {
  const { NextRequest } = await import('next/server');
  const { PATCH } = await import('@/app/api/business-ideas/session/[id]/route');
  return PATCH(new NextRequest(`http://localhost:3000/api/business-ideas/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  }), { params: Promise.resolve({ id: sessionId }) });
}

async function getBrief(sessionId: string) {
  const { GET } = await import('@/app/api/business-ideas/session/[id]/brief/route');
  return GET(new Request(`http://localhost:3000/api/business-ideas/session/${sessionId}/brief`), {
    params: Promise.resolve({ id: sessionId }),
  });
}

describe('Business Idea session APIs', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    process.env.SESSIONS_DIR = TEST_SESSIONS_DIR;
    process.env.STORAGE_BACKEND = 'file';
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SESSIONS_DIR)) fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    delete process.env.SESSIONS_DIR;
    delete process.env.STORAGE_BACKEND;
  });

  it('returns businessIdeaBrief from GET and approves only a brief-ready session', async () => {
    const store = new BusinessIdeaSessionStore();
    const session = await store.createSession();
    const getResponse = await getSession(session.sessionId);
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()).businessIdeaBrief).toEqual(session.businessIdeaBrief);

    expect((await patchSession(session.sessionId, 'approve')).status).toBe(409);
    session.status = 'brief_ready';
    session.briefMarkdown = '# Business Idea Brief';
    await store.updateSession(session);

    const patchResponse = await patchSession(session.sessionId, 'approve');
    expect(patchResponse.status).toBe(200);
    const updated = await store.getSession(session.sessionId);
    expect(updated.status).toBe('approved');
    expect(updated.businessIdeaBrief.approval_status).toBe('approved');
  });

  it('supports revise and downloads the business brief with its filename', async () => {
    const store = new BusinessIdeaSessionStore();
    const session = await store.createSession();
    session.status = 'brief_ready';
    session.briefMarkdown = '# Business Idea Brief\n';
    await store.updateSession(session);

    expect((await patchSession(session.sessionId, 'revise')).status).toBe(200);
    const revised = await store.getSession(session.sessionId);
    expect(revised.status).toBe('in_discovery');

    revised.status = 'approved';
    revised.briefMarkdown = '# Business Idea Brief\n';
    await store.updateSession(revised);
    const response = await getBrief(session.sessionId);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain(`business-idea-brief-${session.sessionId.slice(0, 8)}.md`);
    expect(await response.text()).toBe('# Business Idea Brief\n');
  });
});
