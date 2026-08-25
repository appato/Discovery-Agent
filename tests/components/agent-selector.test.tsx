// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentSelector } from '@/components/agent-selector';

describe('AgentSelector', () => {
  it('exposes both AI guides with their landing routes', () => {
    render(<AgentSelector />);

    expect(screen.getByRole('heading', { name: 'Choose your AI guide' })).toBeTruthy();

    const discoveryLink = screen.getByRole('link', { name: /Product Discovery Agent/i });
    const businessIdeaLink = screen.getByRole('link', { name: /Business Idea Agent/i });

    expect(discoveryLink.getAttribute('href')).toBe('/discovery');
    expect(businessIdeaLink.getAttribute('href')).toBe('/business-idea');
    expect(screen.getByText('Clarify your business, test the shape of an idea, and leave with a project definition.')).toBeTruthy();
  });
});
