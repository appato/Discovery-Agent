// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

Element.prototype.scrollIntoView = vi.fn();

describe('Business Idea session UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the business review copy and three configured coverage segments', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        sessionId: 'business-session-id',
        chatHistory: [],
        coverage: { businessContext: 0.3, ideaOpportunity: 0.2, projectDefinition: 0.1 },
        status: 'brief_ready',
        briefMarkdown: '# Business Idea Brief\n',
        metadata: { businessName: 'Petal & Stem', ideaName: 'Wedding planner' },
      }),
    } as unknown as Response);

    const { default: BusinessIdeaSessionPage } = await import('@/app/business-idea/session/[id]/page');
    render(React.createElement(BusinessIdeaSessionPage, {
      params: Promise.resolve({ id: 'business-session-id' }),
    }));

    await waitFor(() => {
      expect(screen.getByText('Review Your Business Idea Brief')).toBeTruthy();
    });

    expect(screen.getByText('Business Context')).toBeTruthy();
    expect(screen.getByText('Idea Opportunity')).toBeTruthy();
    expect(screen.getByText('Project Definition')).toBeTruthy();
  });

  it('calls business review endpoints and shows the approved brief state', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessionId: 'business-session-id',
          chatHistory: [],
          coverage: { businessContext: 0.8, ideaOpportunity: 0.8, projectDefinition: 0.8 },
          status: 'brief_ready',
          briefMarkdown: '# Business Idea Brief\n',
          metadata: { businessName: 'Petal & Stem', ideaName: 'Wedding planner' },
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'approved' }),
      } as unknown as Response);

    const { default: BusinessIdeaSessionPage } = await import('@/app/business-idea/session/[id]/page');
    render(React.createElement(BusinessIdeaSessionPage, {
      params: Promise.resolve({ id: 'business-session-id' }),
    }));

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeTruthy();
    });

    await userEvent.click(screen.getByText('Approve'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/business-ideas/session/business-session-id',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
    expect(screen.getByText('Business Idea Brief Approved')).toBeTruthy();
    expect(screen.getByText('Download Business Idea Brief')).toBeTruthy();
  });
});
