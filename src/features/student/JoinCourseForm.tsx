
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';

function HelpHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={text}
        aria-label="איפה מוצאים את קוד הקורס?"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs font-bold">?</span>
      </button>
      {open && (
        <div className="absolute top-6 z-10 max-w-[18rem] rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-700 shadow-md" role="status">
          {text}
        </div>
      )}
    </div>
  );
}

export const JoinCourseForm = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      setJoined(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>הצטרפות לקורס חדש</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-md sm:max-w-lg w-full" dir="rtl">
          <div className="mb-3 flex items-center gap-2 text-gray-700">
            <h3 className="text-lg font-semibold">הצטרפות לקורס חדש</h3>
            <HelpHint text="המרצה שולח את קוד הקורס במייל או בוואטסאפ" />
          </div>

          <form
            className="flex flex-col sm:flex-row items-stretch gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^[A-Za-z0-9]{6,10}$/.test(code)) { setError('קוד לא תקין. יש להזין 6–10 אותיות/מספרים.'); return; }
              setError(null);
              handleJoin();
            }}
          >
            <label htmlFor="courseCode" className="sr-only">קוד קורס</label>
            <input
              id="courseCode" dir="ltr"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="הזן את קוד הקורס"
              value={code} onChange={(e) => setCode(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            <button
              type="submit"
              className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-gray-900 hover:bg-amber-300 transition sm:w-auto w-full disabled:opacity-60"
              disabled={loading || !code}
            >
              {loading ? 'מצטרף…' : 'הצטרף לקורס'}
            </button>
          </form>

          <div className="mt-2 text-sm text-gray-500">קוד באורך 6–10 תווים (אותיות/מספרים).</div>
          {error && <div role="status" className="mt-2 text-sm text-red-600">{error}</div>}
          {joined && <div role="status" className="mt-2 text-sm text-green-600">הצטרפת בהצלחה!</div>}
        </div>
      </CardContent>
    </Card>
  );
}
