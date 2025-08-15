import React from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  assignmentName: string;
  reportContent: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, studentName, assignmentName, reportContent }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">דוח ביצועים</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        <div className="mb-4">
          <p><span className="font-semibold">תלמיד:</span> {studentName}</p>
          <p><span className="font-semibold">מטלה:</span> {assignmentName}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-gray-700 whitespace-pre-wrap">{reportContent}</p>
        </div>
        <div className="text-left mt-6">
            <button onClick={onClose} className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors">
                סגור
            </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
