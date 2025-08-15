import { create } from 'zustand';

export interface Assignment {
  id: string;
  name: string;
  type: string;
  topic: string;
  instructions: string;
  botInstructions: string;
  materials: File[];
  startDate: Date;
  dueDate: Date;
}

export interface AssignmentState {
  assignments: Assignment[];
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  removeAssignment: (id: string) => void;
  updateAssignment: (id: string, updatedAssignment: Partial<Omit<Assignment, 'id'>>) => void;
  duplicateAssignment: (id: string) => void;
}

const mockAssignments: Assignment[] = [
  {
    id: '1',
    name: 'מטלה 1: סטטיסטיקה תיאורית',
    type: 'שיעורי בית',
    topic: 'סטטיסטיקה',
    instructions: 'יש לפתור את כל השאלות במחברת ולהגיש סרוק.',
    botInstructions: 'התמקד בהסבר על מדדי מרכז ופיזור. השתמש בדוגמאות מעולם הספורט.',
    materials: [],
    startDate: new Date('2023-10-01'),
    dueDate: new Date('2023-10-10'),
  },
  {
    id: '2',
    name: 'מטלה 2: הסתברות',
    type: 'תרגיל',
    topic: 'הסתברות',
    instructions: 'יש לענות על השאלות במערכת המקוונת.',
    botInstructions: 'הסבר את ההבדל בין הסתברות מותנית לבלתי תלויה. השתמש באנלוגיות של קלפים וכדורים.',
    materials: [],
    startDate: new Date('2023-10-11'),
    dueDate: new Date('2023-10-20'),
  },
];

export const useAssignmentStore = create<AssignmentState>((set) => ({
  assignments: mockAssignments,
  addAssignment: (assignment) =>
    set((state) => ({
      assignments: [...state.assignments, { ...assignment, id: new Date().toISOString() }],
    })),
  removeAssignment: (id) =>
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== id),
    })),
  updateAssignment: (id, updatedAssignment) =>
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === id ? { ...a, ...updatedAssignment } : a
      ),
    })),
  duplicateAssignment: (id) =>
    set((state) => {
      const assignmentToDuplicate = state.assignments.find((a) => a.id === id);
      if (!assignmentToDuplicate) return state;
      const newAssignment = {
        ...assignmentToDuplicate,
        id: new Date().toISOString(),
        name: `${assignmentToDuplicate.name} (העתק)`,
      };
      return { assignments: [...state.assignments, newAssignment] };
    }),
}));
