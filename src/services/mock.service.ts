export interface Student { 
  id: string;
  name: string;
  avgGrade: number;
  lastActivity: string;
  status: 'on-track' | 'at-risk' | 'needs-attention';
}

const mockStudents: Student[] = [
  { id: '1', name: 'ישראל ישראלי', avgGrade: 88, lastActivity: '2025-08-12', status: 'on-track' },
  { id: '2', name: 'משה כהן', avgGrade: 72, lastActivity: '2025-08-10', status: 'at-risk' },
  { id: '3', name: 'אבי לוי', avgGrade: 95, lastActivity: '2025-08-13', status: 'on-track' },
  { id: '4', name: 'דנה שחר', avgGrade: 65, lastActivity: '2025-08-05', status: 'needs-attention' },
  { id: '5', name: 'יעל גולן', avgGrade: 81, lastActivity: '2025-08-11', status: 'on-track' },
];

export const getStudentsForLecturer = async (): Promise<Student[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockStudents;
};
