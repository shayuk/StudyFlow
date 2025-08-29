import 'dotenv/config';
import { signToken } from '../auth/jwt';

function ensureEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is required. Please set it in server/.env`);
  }
  return v;
}

(function main() {
  ensureEnv('JWT_SECRET');

  const orgId = 'org_demo_1';

  const users = [
    { label: 'student', sub: 'u_student_1', roles: ['student'] as const },
    { label: 'instructor', sub: 'u_instructor_1', roles: ['instructor'] as const },
    { label: 'admin', sub: 'u_admin_1', roles: ['admin'] as const },
  ];

  console.log('--- StudyFlow Demo JWT Tokens ---');
  console.log('Org:', orgId);
  console.log('Note: tokens expire in 7d by default. Configure via .env and code if needed.');
  console.log('');

  for (const u of users) {
    const token = signToken({ sub: u.sub, orgId, roles: [...u.roles] });
    console.log(`[${u.label}] userId=${u.sub}`);
    console.log(`Bearer ${token}`);
    console.log('');
  }

  console.log('Usage example:');
  console.log('  curl -H "Authorization: Bearer <paste token>" http://localhost:4000/api/me');
})();
