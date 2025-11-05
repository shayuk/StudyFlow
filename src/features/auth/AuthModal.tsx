import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { registerEmail, loginEmail } from '@/features/auth/api';
import { useAuth, type AuthState } from '@/hooks/useAuth';

export type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  initialRole?: 'student' | 'lecturer';
};

export function AuthModal({ open, onClose, initialRole = 'student' }: AuthModalProps) {
  const navigate = useNavigate();
  const loginWithToken = useAuth((s: AuthState) => s.loginWithToken);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desiredRole] = useState<'student' | 'lecturer'>(initialRole);

  if (!open) return null;

  const handleRegister = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const proceed = (resp: { token: string; user: { id: string; email: string; role: 'student' | 'lecturer' | 'admin' } }) => {
        loginWithToken({ id: resp.user.id, email: resp.user.email, role: resp.user.role }, resp.token);
        onClose();
        const role = resp.user.role;
        if (role === 'lecturer' || role === 'admin') navigate('/app/lecturer/management');
        else navigate('/app/student');
      };

      try {
        const resp = await registerEmail(email);
        proceed(resp);
      } catch (err: any) {
        const msg = String(err?.message || '');
        // If user already exists, fall back to login
        if (msg.startsWith('register_failed_409')) {
          const resp = await loginEmail(email);
          proceed(resp);
        } else {
          throw err;
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl text-left">
        <h2 className="text-xl font-semibold mb-3">התחברות / הרשמה</h2>
        <p className="text-sm text-gray-600 mb-4">הקלד/י אימייל. אם אין חשבון, ניצור אחד עבורך.</p>
        <label className="block text-sm mb-1">אימייל</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="you@example.com"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }}
        />
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>ביטול</Button>
          <Button variant="default" size="sm" onClick={handleRegister} disabled={loading || !email}>
            {loading ? 'מבצע…' : ' המשך'}
          </Button>
        </div>
        <div className="mt-3 text-xs text-gray-500">מצב נבחר: {desiredRole === 'lecturer' ? 'מרצה' : 'סטודנט'} (קביעת התפקיד בפועל מתבצעת בצד השרת)</div>
      </div>
    </div>
  );
}
