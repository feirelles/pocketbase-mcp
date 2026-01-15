/**
 * Unit tests for formatters
 */

import { describe, it, expect } from 'vitest';
import { formatToToml } from '../../src/formatters/toml.js';
import { formatToJson } from '../../src/formatters/json.js';
import { format } from '../../src/formatters/index.js';

describe('formatToToml', () => {
  it('should format simple object to TOML', () => {
    const data = {
      name: 'test',
      count: 42,
      active: true,
    };
    
    const result = formatToToml(data);
    
    expect(result).toContain('name = "test"');
    expect(result).toContain('count = 42');
    expect(result).toContain('active = true');
  });

  it('should format nested objects', () => {
    const data = {
      user: {
        id: 'abc123',
        email: 'test@example.com',
      },
    };
    
    const result = formatToToml(data);
    
    expect(result).toContain('[user]');
    expect(result).toContain('id = "abc123"');
    expect(result).toContain('email = "test@example.com"');
  });

  it('should format arrays of objects', () => {
    const data = {
      items: [
        { id: '1', name: 'first' },
        { id: '2', name: 'second' },
      ],
    };
    
    const result = formatToToml(data);
    
    expect(result).toContain('[[items]]');
    expect(result).toContain('id = "1"');
    expect(result).toContain('name = "first"');
  });

  it('should handle null and undefined values', () => {
    const data = {
      present: 'value',
      missing: undefined,
    };
    
    const result = formatToToml(data);
    
    expect(result).toContain('present = "value"');
    expect(result).not.toContain('missing');
  });

  it('should convert Date objects to ISO strings', () => {
    const date = new Date('2026-01-15T10:30:00.000Z');
    const data = {
      created: date,
    };
    
    const result = formatToToml(data);
    
    expect(result).toContain('created = "2026-01-15T10:30:00.000Z"');
  });

  it('should handle empty objects', () => {
    const result = formatToToml({});
    expect(result).toBe('');
  });

  it('should wrap primitives in value key', () => {
    const result = formatToToml('just a string');
    expect(result).toContain('value = "just a string"');
  });
});

describe('formatToJson', () => {
  it('should format object to pretty JSON', () => {
    const data = {
      name: 'test',
      count: 42,
    };
    
    const result = formatToJson(data);
    
    expect(result).toBe(JSON.stringify(data, null, 2));
  });

  it('should handle nested objects', () => {
    const data = {
      user: {
        id: 'abc123',
        settings: {
          theme: 'dark',
        },
      },
    };
    
    const result = formatToJson(data);
    const parsed = JSON.parse(result);
    
    expect(parsed.user.id).toBe('abc123');
    expect(parsed.user.settings.theme).toBe('dark');
  });

  it('should handle arrays', () => {
    const data = {
      items: [1, 2, 3],
    };
    
    const result = formatToJson(data);
    const parsed = JSON.parse(result);
    
    expect(parsed.items).toEqual([1, 2, 3]);
  });

  it('should handle null values', () => {
    const data = {
      value: null,
    };
    
    const result = formatToJson(data);
    const parsed = JSON.parse(result);
    
    expect(parsed.value).toBeNull();
  });
});

describe('format (router)', () => {
  const testData = { name: 'test', value: 123 };

  it('should default to TOML format', () => {
    const result = format(testData);
    
    expect(result).toContain('name = "test"');
    expect(result).toContain('value = 123');
  });

  it('should use TOML when explicitly specified', () => {
    const result = format(testData, 'toml');
    
    expect(result).toContain('name = "test"');
  });

  it('should use JSON when specified', () => {
    const result = format(testData, 'json');
    
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('test');
    expect(parsed.value).toBe(123);
  });
});
