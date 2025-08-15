import { useState, useEffect } from 'react';
import { useUiStore, type UiState } from '../../../store/ui.store.js';
import { useAnalyticsStore } from '../../../store/analytics.store.js';
import { useAssignmentStore } from '../../../store/assignment.store.js';
import ReportModal from './ReportModal.js';

const getGradeColor = (grade: number) => {
  if (grade >= 85) return 'bg-green-200 text-green-800';
  if (grade >= 70) return 'bg-yellow-200 text-yellow-800';
  return 'bg-red-200 text-red-800';
};

const StudentAnalysisTab = () => {
  const setCurrentContext = useUiStore((state: UiState) => state.setCurrentContext);

  useEffect(() => {
    setCurrentContext('ניתוח תלמידים');
  }, [setCurrentContext]);
  const { students, updateStudentNotes, toggleStudentApproval } = useAnalyticsStore();
  const { assignments } = useAssignmentStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState({ studentName: '', assignmentName: '', content: '' });

  const handleGradeClick = (studentName: string, assignmentName: string, grade: number) => {
    const mockReport = `הסטודנט ${studentName} הפגין הבנה טובה של החומר במטלה "${assignmentName}" וקיבל את הציון ${grade}.\n\nעם זאת, זוהה קושי מסוים בנושא סיווג המשתנים לפי רמה (שמי, סדר, קווזי סדר, רווח, מנה). נראה כי לאחר תרגול נוסף והסבר באמצעות אנלוגיה, הסטודנט הפגין שיפור משמעותי והצליח לענות נכונה על שאלות מתקדמות בנושא.\n\nמומלץ לעקוב אחר התקדמותו במטלות הבאות, בדגש על יישום מעשי של נושא זה.`;
    setSelectedReport({ studentName, assignmentName, content: mockReport });
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <h2 className="text-2xl font-bold p-6 text-gray-800">ניתוח תלמידים</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-right">
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">תלמיד</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">סטטוס</th>
              {assignments.map(ass => (
                <th key={ass.id} className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{ass.name}</th>
              ))}
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">דוח</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">אישור</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">הערות</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="text-right">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'הושלם' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {student.status}
                  </span>
                </td>
                {assignments.map(ass => {
                  const gradeInfo = student.grades.find(g => g.assignmentId === ass.id);
                  return (
                    <td key={ass.id} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {gradeInfo ? (
                        <span 
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-md cursor-pointer hover:ring-2 hover:ring-blue-500 ${getGradeColor(gradeInfo.grade)}`}
                          onClick={() => handleGradeClick(student.name, ass.name, gradeInfo.grade)}
                        >
                          {gradeInfo.grade}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded-md text-xs">צפה</button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <input 
                    type="checkbox" 
                    checked={student.approved} 
                    onChange={() => toggleStudentApproval(student.id)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer" 
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <input 
                    type="text" 
                    defaultValue={student.notes}
                    onBlur={(e) => updateStudentNotes(student.id, e.target.value)}
                    className="w-full p-1 border border-transparent hover:border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studentName={selectedReport.studentName}
        assignmentName={selectedReport.assignmentName}
        reportContent={selectedReport.content}
      />
    </div>
  );
};

export default StudentAnalysisTab;
