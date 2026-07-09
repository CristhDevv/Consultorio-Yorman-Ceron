import { describe, it, expect } from 'vitest';
import { cn } from '@/shared/lib/utils';

describe('Testing Environment Reference', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should successfully resolve path aliases and import cn utility', () => {
    const result = cn('flex', 'items-center', 'justify-between');
    expect(result).toBe('flex items-center justify-between');
  });
});
