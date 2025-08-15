import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useUiStore, type UiState } from '../../../store/ui.store.js';
import { useDropzone } from 'react-dropzone';
import { useAssignmentStore, type Assignment } from '../../../store/assignment.store.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';
import { Textarea } from '../../../components/ui/Textarea.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select.js';
import { UploadCloud, X, Trash2, Copy, Edit } from 'lucide-react';
import { CourseCalendar } from '../../student/CourseCalendar.js';

const AssignmentBuildingTab = () => {
  const setCurrentContext = useUiStore((state: UiState) => state.setCurrentContext);
  useEffect(() => {
    setCurrentContext('בניית מטלות');
  }, [setCurrentContext]);

  const { assignments, addAssignment, removeAssignment, updateAssignment, duplicateAssignment } = useAssignmentStore();
  const [assignmentName, setAssignmentName] = useState('');
  const [assignmentType, setAssignmentType] = useState('');
  const [assignmentTopic, setAssignmentTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [botInstructions, setBotInstructions] = useState('');
  const [materials, setMaterials] = useState<File[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setMaterials(prev => [...prev, ...acceptedFiles]);
  }, []);

  const removeMaterial = (fileName: string) => {
    setMaterials(prev => prev.filter(file => file.name !== fileName));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentName || !assignmentType || !startDate || !dueDate) {
      alert('Please fill all required fields.');
      return;
    }

    const assignmentData = {
      name: assignmentName,
      topic: assignmentTopic,
      type: assignmentType,
      instructions,
      botInstructions,
      materials,
      startDate,
      dueDate,
    };

    if (editingId) {
      updateAssignment(editingId, assignmentData);
    } else {
      addAssignment(assignmentData);
    }
    // Reset form
    setAssignmentName('');
    setAssignmentType('');
    setAssignmentTopic('');
    setInstructions('');
    setBotInstructions('');
    setMaterials([]);
    setStartDate(undefined);
    setDueDate(undefined);
    setEditingId(null);
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setAssignmentName(assignment.name);
    setAssignmentTopic(assignment.topic);
    setAssignmentType(assignment.type);
    setInstructions(assignment.instructions);
    setBotInstructions(assignment.botInstructions);
    setMaterials(assignment.materials);
    setStartDate(assignment.startDate);
    setDueDate(assignment.dueDate);
  };

  const calendarEvents = useMemo(() => {
    return assignments.map(assignment => ({
      title: assignment.name,
      start: assignment.startDate,
      end: assignment.dueDate,
      backgroundColor: '#f59e0b', // amber-500
      borderColor: '#f59e0b'
    }));
  }, [assignments]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4">
      {/* Left Column: Form */}
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-6">יצירת מטלה חדשה</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="assignmentName" className="block text-sm font-medium text-gray-700 mb-1">שם המטלה</label>
            <Input id="assignmentName" value={assignmentName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignmentName(e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">נושא המטלה</label>
            <Input id="assignmentTopic" value={assignmentTopic} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignmentTopic(e.target.value)} />
          </div>

          <div>
            <label htmlFor="assignmentType" className="block text-sm font-medium text-gray-700 mb-1">סוג המטלה</label>
            <Select onValueChange={setAssignmentType} value={assignmentType}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג מטלה..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essay">מטלת כתיבה (חיבור)</SelectItem>
                <SelectItem value="quiz">בוחן</SelectItem>
                <SelectItem value="project">פרויקט</SelectItem>
                <SelectItem value="coding">מטלת תכנות</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">הוראות</label>
            <Textarea id="instructions" value={instructions} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInstructions(e.target.value)} placeholder="הסבר לסטודנטים מה עליהם לעשות..." />
          </div>

          <div>
            <label htmlFor="botInstructions" className="block text-sm font-medium text-gray-700 mb-1">הוראות לבוט (פרומפט)</label>
            <Textarea id="botInstructions" value={botInstructions} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBotInstructions(e.target.value)} placeholder="הנחיות שישפיעו על אופן הסיוע של הבוט במטלה זו..." />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">חומרי עזר לבוט</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">גרור קבצים לכאן, או לחץ לבחירה</p>
            </div>
            {materials.length > 0 && (
              <ul className="mt-4 space-y-2">
                {materials.map(file => (
                  <li key={file.name} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md">
                    <span className="font-medium">{file.name}</span>
                    <button type="button" onClick={() => removeMaterial(file.name)} className="text-red-500 hover:text-red-700">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">תאריך התחלה</label>
              {/* Date picker will go here */}
              <Input type="datetime-local" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(new Date(e.target.value))} required />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">תאריך הגשה</label>
              {/* Date picker will go here */}
              <Input type="datetime-local" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(new Date(e.target.value))} required />
            </div>
          </div>

          <Button type="submit" className="w-full">
            {editingId ? 'עדכן מטלה' : 'צור מטלה'}
          </Button>
        </form>
      </div>

      {/* Right Column: Calendar and List */}
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold mb-4">לוח זמנים</h3>
          <CourseCalendar events={calendarEvents} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold mb-4">מטלות קיימות</h3>
          <ul className="space-y-3">
            {assignments.length > 0 ? assignments.map(ass => (
              <li key={ass.id} className="p-3 bg-gray-50 rounded-md border flex justify-between items-center">
                <div>
                  <p className="font-semibold">{ass.name}</p>
                  <p className="text-sm text-gray-600">הגשה: {new Date(ass.dueDate).toLocaleDateString('he-IL')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(ass)} className="p-1 text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                  <button onClick={() => duplicateAssignment(ass.id)} className="p-1 text-green-600 hover:text-green-800"><Copy size={16} /></button>
                  <button onClick={() => removeAssignment(ass.id)} className="p-1 text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </div>
              </li>
            )) : (
              <p className="text-sm text-gray-500">אין מטלות עדיין.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssignmentBuildingTab;

