import { useEffect, useState } from 'react';
import { getStudentsForLecturer } from '../../services/mock.service.js';
import type { Student } from '../../services/mock.service.js';

const statusStyles = {
  'on-track': 'bg-success/20 text-success',
  'at-risk': 'bg-secondary/20 text-secondary-dark',
  'needs-attention': 'bg-red-500/20 text-red-600',
};

export const StudentAnalysisTab = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
        getStudentsForLecturer().then((data: Student[]) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>טוען סטודנטים...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">אנליזת סטודנטים</h2>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-left text-gray-dark">
          <thead className="bg-gray-light text-xs uppercase">
            <tr>
              <th scope="col" className="px-6 py-3">שם</th>
              <th scope="col" className="px-6 py-3">ציון ממוצע</th>
              <th scope="col" className="px-6 py-3">פעילות אחרונה</th>
              <th scope="col" className="px-6 py-3">סטטוס</th>
              <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium whitespace-nowrap">{student.name}</td>
                <td className="px-6 py-4">{student.avgGrade}</td>
                <td className="px-6 py-4">{student.lastActivity}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[student.status]}`}>
                    {student.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="font-medium text-primary hover:underline">ניתוח</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
