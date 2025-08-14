

// Placeholder for the StudyFlow logo
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { BrainCircuit, ArrowRight } from 'lucide-react';

const Logo = () => (
  <div className="flex items-center gap-x-2">
    <BrainCircuit className="w-10 h-10 text-primary" />
    <span className="text-2xl font-bold text-text-primary">StudyFlow</span>
  </div>
);

export const LandingPage = () => {
  const navigate = useNavigate();
  const loginByRole = useAuth((state) => state.loginByRole);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <Logo />
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
              loginByRole('student');
              navigate('/app/student');
            }}>
              <span>כניסת סטודנט</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => {
              loginByRole('lecturer');
              navigate('/app/lecturer/management');
            }}>
              <span>כניסת מרצה</span>
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
