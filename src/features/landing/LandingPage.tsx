// Placeholder for the StudyFlow logo
import { useNavigate } from 'react-router-dom';
import { useAuth, type AuthState } from '../../hooks/useAuth.ts';
import Button from '../../components/ui/Button.tsx';
import { motion } from 'framer-motion';
import { BrainCircuit, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { registerEmail } from '@/features/auth/api';

const Logo = () => (
  <div className="flex items-center gap-x-2">
    <BrainCircuit className="w-10 h-10 text-primary" />
    <span className="text-2xl font-bold text-text-primary">StudyFlow</span>
  </div>
);

export const LandingPage = () => {
  const navigate = useNavigate();
  const loginByRole = useAuth((state: AuthState) => state.loginByRole);
  const loginWithToken = useAuth((state: AuthState) => state.loginWithToken);
  const [showAuth, setShowAuth] = useState(false);
  const [desiredRole, setDesiredRole] = useState<'student' | 'lecturer'>('student');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await registerEmail(email);
      loginWithToken({ id: resp.user.id, email: resp.user.email, role: resp.user.role }, resp.token);
      setShowAuth(false);
      const role = resp.user.role;
      if (role === 'lecturer' || role === 'admin') {
        navigate('/app/lecturer/management');
      } else {
        navigate('/app/student');
      }
    } catch (e: any) {
      setError(e?.message || 'Register failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <Logo />
        {import.meta.env.MODE !== 'production' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.open('http://localhost:4000/admin', '_blank');
            }}
          >
            DEV Admin
          </Button>
        )}
      </header>

      <main className="container mx-auto flex flex-col items-center justify-center min-h-screen text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
            ברוך הבא ל-StudyFlow!
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-3xl mb-8">
            GALIBOT - הבוט האישי שלך - כאן לייצר, להסביר ולתרגל אתך נושא בקורס!
            הפוך כל נושא לימודי לחוויה אינטראקטיבית ומרתקת.
          </p>
          <div className="w-full max-w-2xl bg-surface rounded-xl shadow-2xl p-4 mb-8 border border-border-color">
            <div className="bg-primary/10 aspect-video flex items-center justify-center rounded-lg">
              <BrainCircuit className="w-24 h-24 text-primary opacity-30" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="default" size="lg" onClick={() => {
              setDesiredRole('student');
              setShowAuth(true);
            }}>
              <span>כניסת סטודנט</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => {
              setDesiredRole('lecturer');
              setShowAuth(true);
            }}>
              <span>כניסת מרצה</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </main>

      {showAuth && (
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
              <Button variant="secondary" size="sm" onClick={() => setShowAuth(false)} disabled={loading}>ביטול</Button>
              <Button variant="default" size="sm" onClick={handleRegister} disabled={loading || !email}>
                {loading ? 'מבצע…' : ' המשך'}
              </Button>
            </div>
            <div className="mt-3 text-xs text-gray-500">מצב נבחר: {desiredRole === 'lecturer' ? 'מרצה' : 'סטודנט'} (קביעת התפקיד בפועל מתבצעת בצד השרת)</div>
          </div>
        </div>
      )}
    </div>
  );
};
