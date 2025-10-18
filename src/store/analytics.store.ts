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

// Initialize empty (no demo/mocks in production UI)
const initialStudents: Student[] = [];

export interface AnalyticsState {
  students: Student[];
  updateStudentNotes: (studentId: string, notes: string) => void;
  toggleStudentApproval: (studentId: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  students: initialStudents,
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
