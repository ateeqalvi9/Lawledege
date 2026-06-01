export const ADMIN_EMAIL = 'admin@lawledge.pk';
export const ADMIN_PASSWORD = 'Admin@123';

export function getRole(profile, user) {
  const email = (user?.email || '').toLowerCase();
  if (email === ADMIN_EMAIL) return 'admin';
  if (profile?.role === 'admin') return 'admin';
  if (profile?.role === 'volunteer' || profile?.is_volunteer || profile?.level) return 'volunteer';
  return 'user';
}

export function isAdmin(profile, user) {
  return getRole(profile, user) === 'admin';
}

export function isVolunteer(profile, user) {
  const role = getRole(profile, user);
  return role === 'volunteer' || role === 'admin';
}

export function directRoomFor(a, b) {
  return ['direct', ...[a, b].sort()].join('_');
}

export function initials(name = '', fallback = '?') {
  const cleaned = String(name || '').trim();
  if (!cleaned) return fallback;
  return cleaned.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}
