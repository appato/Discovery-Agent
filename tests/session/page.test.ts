import { describe, it, expect } from 'vitest';



describe('/session page', () => {


  it('redirects to /session/{id} when visited', async () => {
    const { default: SessionPage } = await import('../../app/session/page');

    try {
      await SessionPage();
      expect.fail('Expected redirect but none was thrown');
    } catch (error: any) {
      // Next.js redirect throws a special error with digest in format:
      // NEXT_REDIRECT;{type};{url};{statusCode};
      const digest = error.digest || '';
      if (!digest.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      const parts = digest.split(';');
      const url = parts[2];
      expect(url).toMatch(/^\/session\/[\w-]+$/);
    }
  });
});
