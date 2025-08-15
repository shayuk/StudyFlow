import { create } from 'zustand';

export interface StudentGrade {
  assignmentId: string;
  grade: number;
}

export interface Student {
  id: string;
  name: string;
  status: 'הושלם' | 'בתהליך';
  grades: StudentGrade[];
  approved: boolean;
  notes: string;
}

// Mock data that aligns with potential assignment IDs
const mockStudents: Student[] = [
    {
        id: 'student-1',
        name: 'טומי',
        status: 'הושלם',
        grades: [
            { assignmentId: '1', grade: 90 },
            { assignmentId: '2', grade: 85 },
            { assignmentId: '3', grade: 78 },
        ],
        approved: true,
        notes: 'עבודה מצוינת',
    },
    {
        id: 'student-2',
        name: 'סמנתה סמית',
        status: 'בתהליך',
        grades: [
            { assignmentId: '1', grade: 72 },
            { assignmentId: '2', grade: 68 },
            { assignmentId: '3', grade: 60 },
        ],
        approved: false,
        notes: 'נדרש שיפור במטלה 3',
    },
    {
        id: 'student-3',
        name: 'קארל',
        status: 'בתהליך',
        grades: [
            { assignmentId: '1', grade: 88 },
            { assignmentId: '2', grade: 70 },
            { assignmentId: '3', grade: 65 },
        ],
        approved: false,
        notes: 'מאמץ טוב',
    },
];

export interface AnalyticsState {
  students: Student[];
  updateStudentNotes: (studentId: string, notes: string) => void;
  toggleStudentApproval: (studentId: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  students: mockStudents,
  updateStudentNotes: (studentId, notes) =>
    set((state) => ({
      students: state.students.map((s) =>
        s.id === studentId ? { ...s, notes } : s
      ),
    })),
  toggleStudentApproval: (studentId) =>
    set((state) => ({
      students: state.students.map((s) =>
        s.id === studentId ? { ...s, approved: !s.approved } : s
      ),
    })),
}));
