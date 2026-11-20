import { describe, expect, it } from 'vitest';
import { canPlatform, platformDestination } from '@/lib/platform-permissions';
describe('Platform permission isolation', () => {
  it('grants platform administration to super administrators', () => {
    expect(canPlatform(['super_admin'], 'admin.platform')).toBe(true);
    expect(platformDestination(['super_admin'])).toBe('/admin');
  });
  it('does not promote SACCO administrators to platform administrators', () => {
    expect(canPlatform(['sacco_admin'], 'admin.users')).toBe(false);
    expect(platformDestination(['sacco_admin'])).toBe('/account');
  });
  it('does not turn a requested administrator role into authorization', () => {
    expect(canPlatform(['farmer', 'admin'], 'admin.platform')).toBe(false);
  });
});