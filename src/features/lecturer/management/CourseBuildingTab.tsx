import React, { useState, useEffect } from 'react';
import { useUiStore } from '../../../store/ui.store.js';
import { Button } from '../../../components/ui/Button.tsx';
import { Input } from '../../../components/ui/Input.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card.tsx';
import { PlusCircle, Trash2, Copy } from 'lucide-react';

interface Lesson {
  id: number;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface Exam {
  id: number;
  date: string;
}

const CourseBuildingTab: React.FC = () => {
  const setCurrentContext = useUiStore((state) => state.setCurrentContext);
  const [courseName, setCourseName] = useState('');
  const [courseNumber, setCourseNumber] = useState('');
  const [courseStartDate, setCourseStartDate] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([{ id: 1, name: '', date: '', startTime: '', endTime: '' }]);
  const [exams, setExams] = useState<Exam[]>([{ id: 1, date: '' }]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  useEffect(() => {
    setCurrentContext('בניית קורס');
  }, [setCurrentContext]);

  const addLesson = () => {
    setLessons([...lessons, { id: Date.now(), name: '', date: '', startTime: '', endTime: '' }]);
  };

  const removeLesson = (id: number) => {
    setLessons(lessons.filter(lesson => lesson.id !== id));
  };

  const addExam = () => {
    setExams([...exams, { id: Date.now(), date: '' }]);
  };

  const removeExam = (id: number) => {
    setExams(exams.filter(exam => exam.id !== id));
  };

  const handleCreateCourse = () => {
    // In a real app, this would send data to a server
    const newCode = `STUDY${Math.floor(Math.random() * 9000) + 1000}`;
    setGeneratedCode(newCode);
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      // Optional: show a toast notification
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>יצירת קורס חדש</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="courseName">שם הקורס</label>
              <Input id="courseName" placeholder="לדוגמה: מבוא לסטטיסטיקה" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="courseNumber">מספר קורס</label>
              <Input id="courseNumber" placeholder="מספר קורס מהאקדמיה" value={courseNumber} onChange={(e) => setCourseNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="courseStartDate">תאריך תחילת הקורס</label>
              <Input id="courseStartDate" type="date" value={courseStartDate} onChange={(e) => setCourseStartDate(e.target.value)} />
            </div>

            <div>
              <h3 className="font-medium mb-2">שיעורים</h3>
              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <div key={lesson.id} className="flex items-end gap-2 p-3 bg-gray-50 rounded-md border">
                    <Input placeholder={`שם שיעור ${index + 1}`} className="flex-grow" />
                    <Input type="date" />
                    <Input type="time" />
                    <Input type="time" />
                    <Button variant="ghost" size="icon" onClick={() => removeLesson(lesson.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addLesson}>
                <PlusCircle className="h-4 w-4 mr-2" />
                הוסף שיעור
              </Button>
            </div>

            <div>
              <h3 className="font-medium mb-2">מועדי בחינה</h3>
              <div className="space-y-2">
                {exams.map((exam) => (
                  <div key={exam.id} className="flex items-center gap-2">
                     <Input type="date" />
                     <Button variant="ghost" size="icon" onClick={() => removeExam(exam.id)}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={addExam}>
                <PlusCircle className="h-4 w-4 mr-2" />
                הוסף מועד
              </Button>
            </div>

            <div className="flex justify-start items-end gap-4 pt-6 border-t mt-6">
               {/* Course Code Box */}
              <div>
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">קוד הקורס שלך</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    {generatedCode ? (
                      <div className="flex items-center bg-gray-100 rounded-md p-2">
                        <span className="flex-grow text-lg font-mono text-text-primary">{generatedCode}</span>
                        <Button variant="accent" size="sm" onClick={copyCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 p-4 text-sm">
                        הקוד יופיע כאן
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
               {/* Create Course Button */}
              <Button size="lg" onClick={handleCreateCourse}>צור קורס</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseBuildingTab;
