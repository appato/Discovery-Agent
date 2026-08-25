import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

const { sessionRows, mockSupabaseClient } = vi.hoisted(() => {
  const rows = new Map<string, Record<string, unknown>>();

  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  const client = {
    from(table: string) {
      if (table !== 'sessions') {
        throw new Error(`Unexpected Supabase table in test: ${table}`);
      }

      return {
        insert(row: Record<string, unknown>) {
          if (rows.has(String(row.id))) {
            return Promise.resolve({ error: { message: 'duplicate session' } });
          }

          rows.set(String(row.id), clone(row));
          return Promise.resolve({ error: null });
        },
        select() {
          return {
            eq(_column: string, value: string) {
              return {
                single: async () => {
                  const row = rows.get(value);
                  return row
                    ? { data: clone(row), error: null }
                    : { data: null, error: { message: 'Session not found' } };
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          return {
            eq(_column: string, value: string) {
              const row = rows.get(value);
              if (!row) {
                return Promise.resolve({ error: { message: 'Session not found' } });
              }

              rows.set(value, { ...row, ...clone(values) });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
    storage: {
      from() {
        return {
          upload: async () => ({ data: null, error: null }),
        };
      },
    },
  };

  return { sessionRows: rows, mockSupabaseClient: client };
});

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => mockSupabaseClient,
}));

beforeEach(() => {
  sessionRows.clear();
});
