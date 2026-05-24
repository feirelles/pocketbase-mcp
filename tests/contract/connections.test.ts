/**
 * Contract tests for connection-management tool schemas.
 */

import { describe, it, expect } from 'vitest';
import {
  ConnectInputSchema,
  DisconnectInputSchema,
  ListConnectionsInputSchema,
} from '../../src/schemas/connections.js';

describe('ConnectInputSchema', () => {
  it('accepts a valid name + URL', () => {
    const r = ConnectInputSchema.safeParse({ name: 'local', url: 'http://localhost:8090' });
    expect(r.success).toBe(true);
  });

  it('accepts hyphenated/underscored names', () => {
    const r = ConnectInputSchema.safeParse({ name: 'proj-a_42', url: 'http://localhost:8090' });
    expect(r.success).toBe(true);
  });

  it('defaults format to toml', () => {
    const r = ConnectInputSchema.safeParse({ name: 'local', url: 'http://localhost:8090' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.format).toBe('toml');
  });

  it('rejects an empty name', () => {
    const r = ConnectInputSchema.safeParse({ name: '', url: 'http://localhost:8090' });
    expect(r.success).toBe(false);
  });

  it('rejects names with disallowed characters', () => {
    const r = ConnectInputSchema.safeParse({ name: 'pro j', url: 'http://localhost:8090' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid URLs', () => {
    const r = ConnectInputSchema.safeParse({ name: 'local', url: 'not-a-url' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown fields (strict)', () => {
    const r = ConnectInputSchema.safeParse({
      name: 'local',
      url: 'http://localhost:8090',
      extra: true,
    });
    expect(r.success).toBe(false);
  });
});

describe('DisconnectInputSchema', () => {
  it('accepts a valid name', () => {
    const r = DisconnectInputSchema.safeParse({ name: 'local' });
    expect(r.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const r = DisconnectInputSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('accepts format=json', () => {
    const r = DisconnectInputSchema.safeParse({ name: 'local', format: 'json' });
    expect(r.success).toBe(true);
  });
});

describe('ListConnectionsInputSchema', () => {
  it('accepts an empty payload (format defaults to toml)', () => {
    const r = ListConnectionsInputSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.format).toBe('toml');
  });

  it('accepts format=json', () => {
    const r = ListConnectionsInputSchema.safeParse({ format: 'json' });
    expect(r.success).toBe(true);
  });

  it('rejects unknown fields', () => {
    const r = ListConnectionsInputSchema.safeParse({ instance: 'local' });
    expect(r.success).toBe(false);
  });
});
