import { describe, it, expect } from 'vitest';
import { cn } from '../src/utils/cn';

describe('cn - class name helper', () => {
  it('should join class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should filter false/undefined/null', () => {
    expect(cn('foo', false, 'bar', null, undefined)).toBe('foo bar');
  });

  it('should return empty string for no truthy values', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('should handle single class', () => {
    expect(cn('only')).toBe('only');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled')).toBe('btn btn-active');
  });
});
