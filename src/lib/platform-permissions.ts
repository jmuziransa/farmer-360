export const platformPermissions = ['admin.platform', 'admin.users', 'admin.audit', 'admin.reference'] as const;
export type PlatformPermission = typeof platformPermissions[number];
export function canPlatform(roles: readonly string[], permission: PlatformPermission) {
  return roles.includes('super_admin') && platformPermissions.includes(permission);
}
export function platformDestination(roles: readonly string[]) {
  return canPlatform(roles, 'admin.platform') ? '/admin' : '/account';
}