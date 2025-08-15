

import { useState, useEffect } from 'react';
import { useUiStore, type UiState } from '../../../store/ui.store.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAnalyticsStore } from '../../../store/analytics.store.js';
import { useAssignmentStore } from '../../../store/assignment.store.js';
import { useAuthStore } from '../../../store/auth.store.js';
import { useNotificationStore } from '../../../store/notification.store.js';

const ClassAnalysisTab = () => {
  const setCurrentContext = useUiStore((state: UiState) => state.setCurrentContext);

  useEffect(() => {
    setCurrentContext('ניתוח כיתה');
  }, [setCurrentContext]);
  const { students } = useAnalyticsStore();
  const { assignments } = useAssignmentStore();
  const [notes, setNotes] = useState('');
  const { addNotification, notifications } = useNotificationStore();
  const { user } = useAuthStore();

  // Process data for Grades Distribution chart
  const gradeRanges = [
    { name: '0-59', range: [0, 59] },
    { name: '60-69', range: [60, 69] },
    { name: '70-79', range: [70, 79] },
    { name: '80-89', range: [80, 89] },
    { name: '90-100', range: [90, 100] },
  ];

  const gradesDistributionData = gradeRanges.map(r => {
    const count = students.reduce((acc, student) => {
      const gradesInBin = student.grades.filter(g => g.grade >= r.range[0] && g.grade <= r.range[1]).length;
      return acc + gradesInBin;
    }, 0);
    return { name: r.name, 'מספר תלמידים': count };
  });

  // Process data for Completion Rate chart
  const completedCount = students.filter(s => s.status === 'הושלם').length;
  const inProgressCount = students.length - completedCount;
  const completionData = [
    { name: 'הושלם', value: completedCount },
    { name: 'בתהליך', value: inProgressCount },
  ];
  const COLORS = ['#00C49F', '#FF8042'];
  const totalStudents = students.length;
  const completionPercentage = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  // Process data for Difficulty Heatmap
  const topicDifficulty = assignments.map(assignment => {
    const relevantGrades = students.flatMap(s => s.grades.filter(g => g.assignmentId === assignment.id));
    const averageGrade = relevantGrades.length > 0 
      ? relevantGrades.reduce((sum, g) => sum + g.grade, 0) / relevantGrades.length
      : 0;
    return { topic: assignment.topic, difficulty: 100 - averageGrade }; // Higher difficulty for lower grades
  });

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty > 60) return 'bg-red-500';
    if (difficulty > 40) return 'bg-orange-400';
    return 'bg-green-500';
  };

  // Generate Alerts & Recommendations
  const hardestTopic = topicDifficulty.reduce((max, item) => item.difficulty > max.difficulty ? item : max, topicDifficulty[0] || { topic: 'N/A', difficulty: 0 });
  const lowPerformersCount = gradesDistributionData.find(bin => bin.name === '0-59')?.['מספר תלמידים'] || 0;
  const lowPerformersPercentage = totalStudents > 0 ? Math.round((lowPerformersCount / totalStudents) * 100) : 0;

      useEffect(() => {
    if (user?.role !== 'lecturer') return;

    const potentialAlerts = [
      {
        condition: hardestTopic.difficulty > 60,
        message: `הנושא '${hardestTopic.topic}' מאתגר במיוחד את הכיתה.`,
        type: 'warning' as const,
      },
      {
        condition: completionPercentage < 75 && totalStudents > 0,
        message: `שיעור ההשלמה (${completionPercentage}%) נמוך מהיעד. כדאי לבדוק את הסיבות.`,
        type: 'info' as const,
      },
      {
        condition: lowPerformersCount > students.length * 0.2 && lowPerformersCount > 0,
        message: `${lowPerformersCount} תלמידים קיבלו ציון נכשל. יש צורך בהתערבות.`,
        type: 'danger' as const,
      },
    ];

    potentialAlerts.forEach(alert => {
      if (alert.condition) {
        const alreadyExists = notifications.some(n => n.message === alert.message);
        if (!alreadyExists) {
          addNotification(alert.message, alert.type);
        }
      }
    });
  }, [students, assignments, addNotification, notifications, hardestTopic, completionPercentage, lowPerformersCount, totalStudents]);

  const alerts = notifications.filter(n => n.type === 'warning' || n.type === 'danger' || n.type === 'info').slice(-3); // Show latest 3 relevant alerts

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">ניתוח כיתה</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">התפלגות ציונים</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradesDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="מספר תלמידים" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">מפת קושי</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {topicDifficulty.map((item, index) => (
                <div key={index} className="relative p-4 rounded-lg text-white flex flex-col items-center justify-center shadow-lg overflow-hidden" style={{ minHeight: '100px' }}>
                  <div className={`w-full h-full absolute top-0 left-0 rounded-lg opacity-80 ${getDifficultyColor(item.difficulty)}`}></div>
                  <span className="font-bold text-lg z-10">{item.topic}</span>
                  <span className="text-sm z-10">קושי: {item.difficulty.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">שיעור השלמה</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {completionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold">
                  {`${completionPercentage}%`}
                </text>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#00C49F]"></span>
                    <span>הושלם</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#FF8042]"></span>
                    <span>בתהליך</span>
                </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">התראות והמלצות</h3>
            <div className="space-y-3">
              {alerts.length > 0 ? alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg text-sm ${alert.type === 'danger' ? 'bg-red-100 text-red-800' : alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                  {alert.message}
                </div>
              )) : <p className="text-gray-500 text-center">אין התראות חדשות.</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-bold text-lg mb-4">הערות המרצה</h3>
           <textarea
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="הוסף כאן את ההערות האישיות שלך..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-bold text-lg mb-4">סיכום ותובנות (SWOT)</h3>
          <div className="text-right p-4 bg-gray-100 rounded-lg space-y-4">
              <div>
                <h4 className="font-bold text-lg mb-2">סיכום התמונה הכוללת</h4>
                <p>הכיתה מפגינה רמת הבנה טובה של החומר, עם שיעור השלמה גבוה של {completionPercentage}%. עם זאת, כ-{lowPerformersPercentage}% מהסטודנטים עדיין מתקשים וקיבלו ציונים נמוכים, במיוחד בנושא '{hardestTopic.topic}'. יש לשים לב לפערים אלו כדי להבטיח התקדמות אחידה.</p>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-2">ניתוח SWOT</h4>
                <p className="mb-2"><strong className="text-green-600">חוזקות:</strong> שיעור ההשלמה הגבוה ({completionPercentage}%) ורמת ההבנה הכללית הטובה מהווים בסיס איתן להמשך. רוב הכיתה מגלה מעורבות ומצליחה לעמוד ביעדים.</p>
                <p className="mb-2"><strong className="text-red-600">חולשות:</strong> זוהה קושי ממוקד בנושא '{hardestTopic.topic}', המהווה חולשה נקודתית שיש לטפל בה. בנוסף, קיימת קבוצת תלמידים ({lowPerformersCount}) המפגינה קשיים וזקוקה לתמיכה נוספת.</p>
                <p className="mb-2"><strong className="text-blue-600">הזדמנויות:</strong> ניתן למנף את החוזקות הכיתתיות על ידי הטמעת למידת עמיתים, בה תלמידים חזקים יסייעו למתקשים. כמו כן, זוהי הזדמנות לחזק את הנושאים המאתגרים באמצעות תרגול ממוקד ומתן חומרי עזר נוספים.</p>
                <p><strong className="text-yellow-600">איומים:</strong> אי-טיפול בקשיים הנקודתיים עלול להוביל לפתיחת פערים לימודיים משמעותיים יותר בהמשך הקורס ולירידה במוטיבציה של התלמידים המתקשים.</p>
              </div>
               <div>
                <h4 className="font-bold text-lg mb-2">המלצות אופרטיביות</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>מומלץ לבצע חזרה ממוקדת על נושא '{hardestTopic.topic}' בתחילת השיעור הקרוב.</li>
                  <li>יש לשקול מתן תרגול כיתתי נוסף בנושא זה. ניתן להתייעץ עם הבוט לקבלת סיוע בבניית מטלה מותאמת.</li>
                  <li>מומלץ ליצור קשר אישי עם {lowPerformersCount} התלמידים שהוגדרו כמתקשים, להבין את מקור הקושי ולהציע תמיכה.</li>
                </ul>
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ClassAnalysisTab;
