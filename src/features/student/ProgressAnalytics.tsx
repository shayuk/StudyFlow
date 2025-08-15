import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';



interface AnalyticsData {
  name: string;
  'רמת שליטה': number;
  color: string;
}

const mockApiCall = (): Promise<AnalyticsData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { name: 'סטטיסטיקה', 'רמת שליטה': 90, color: '#22c55e' },
        { name: 'רגרסיה', 'רמת שליטה': 30, color: '#ef4444' },
        { name: 'הסתברות', 'רמת שליטה': 60, color: '#f59e0b' },
        { name: 'אלגברה', 'רמת שליטה': 75, color: '#22c55e' },
      ]);
    }, 1500);
  });
};

export const ProgressAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
      const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await mockApiCall();
      setAnalyticsData(data);
      setLoading(false);
    };


        fetchData();
  }, []);

  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>החוזקות והחולשות שלי</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="font-bold mb-2 text-text-primary">גרף התקדמות</h3>
                    <div className="h-48 w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full text-text-secondary">טוען נתונים...</div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} hide />
                                                                <YAxis dataKey="name" type="category" width={180} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(238, 242, 255, 0.5)' }}
                  contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#ffffff' }}
                />
                <Bar dataKey="רמת שליטה" radius={[0, 4, 4, 0]}>
                  {analyticsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2 text-text-primary">ניתוח נושאים</h3>
          <div className="space-y-2">
            <div className="bg-green-100 text-green-800 p-2 rounded">סטטיסטיקה תיאורית — חזק</div>
            <div className="bg-red-100 text-red-800 p-2 rounded">רגרסיה — דרוש חיזוק</div>
            <div className="bg-amber-100 text-amber-800 p-2 rounded">הסתברות — ממוצע</div>
          </div>
        </div>

        <div className="bg-primary-light p-4 rounded-lg">
          <h4 className="font-bold text-white mb-2">פידבק מ-GaliBot</h4>
          <p className="text-white mb-4">ממליץ לך לתרגל שוב את נושא הרגרסיה. רוצה שאפתח עבורך תרגול עכשיו?</p>
          <div className="flex gap-2">
            <Button>כן, תרגול עכשיו</Button>
            <Button variant="secondary">קבל הסבר</Button>
            <Button variant="ghost">דווח על קושי</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
