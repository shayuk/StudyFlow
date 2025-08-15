import { useState } from 'react';
import StudentAnalysisTab from './StudentAnalysisTab.js';
import ClassAnalysisTab from './ClassAnalysisTab.js';

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('student-analysis');

  return (
    <div className="p-8">
      <div className="flex border-b mb-4">
        <button 
          onClick={() => setActiveTab('student-analysis')}
          className={`py-2 px-4 text-lg font-semibold ${activeTab === 'student-analysis' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
          ניתוח תלמידים
        </button>
        <button 
          onClick={() => setActiveTab('class-analysis')}
          className={`py-2 px-4 text-lg font-semibold ${activeTab === 'class-analysis' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
          ניתוח כיתה
        </button>
      </div>
      <div>
        {activeTab === 'student-analysis' && <StudentAnalysisTab />}
        {activeTab === 'class-analysis' && <ClassAnalysisTab />}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
