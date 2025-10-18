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

const initialAssignments: Assignment[] = [];

export const useAssignmentStore = create<AssignmentState>((set) => ({
  assignments: initialAssignments,
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
