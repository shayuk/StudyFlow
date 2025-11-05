export function isLecturerRole(role?: string): boolean {
  const r = String(role || '').toLowerCase().trim();
  return r === 'instructor' || r === 'lecturer' || r === 'teacher' || r === 'admin';
}

export function normalizeRole(role?: string): 'lecturer' | 'student' {
  return isLecturerRole(role) ? 'lecturer' : 'student';
}
