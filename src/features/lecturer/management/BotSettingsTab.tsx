import { useState, useCallback, useEffect } from 'react';
import { useDropzone, type FileRejection, type Accept } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Link as LinkIcon, Edit, Copy, Trash2, Check } from 'lucide-react';
import { useKnowledgeBaseStore } from '../../../store/knowledgeBase.store.js';
import { useUiStore, type UiState } from '../../../store/ui.store.js';

const BotSettingsTab = () => {
  const setCurrentContext = useUiStore((state: UiState) => state.setCurrentContext);

  useEffect(() => {
    setCurrentContext('הגדרות בוט סטודנטים');
  }, [setCurrentContext]);
  const {
    files: uploadedFiles,
    links,
    prompts,
    addFile,
    addLink: addLinkToStore,
    removeFile,
    removeLink,
    updateLink,
    setFiles,
    setPrompts,
    isUpdating,
    lastUpdated,
    updateKnowledgeBase,
  } = useKnowledgeBaseStore();
  
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);
  const [currentLink, setCurrentLink] = useState('');
  const [editingLink, setEditingLink] = useState<{ index: number; value: string } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setFiles([...uploadedFiles, ...acceptedFiles]);
    setRejectedFiles(fileRejections);
  }, [uploadedFiles, setFiles]);

  const handleAddLink = () => {
    if (currentLink && !links.includes(currentLink)) {
      try {
        new URL(currentLink);
        addLinkToStore(currentLink);
        setCurrentLink('');
      } catch {
        alert('אנא הזן קישור תקין.');
      }
    }
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const newFile = new File([file], `pasted-image-${Date.now()}.${file.type.split('/')[1]}`, { type: file.type });
          addFile(newFile);
        }
      }
    }
  }, [addFile]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const acceptedFileTypes: Accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.svg'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt', '.md'],
    'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
    'audio/*': ['.mp3', '.wav', '.ogg'],
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
  });

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">הגדרות בוט סטודנטים</h2>
        <p className="text-gray-600 mt-1">
          כאן ניתן להעלות את כל חומרי הקורס שישמשו כבסיס הידע עבור הבוט. הבוט ילמד אך ורק מהחומרים שתעלו כאן.
        </p>
      </div>

      {/* File Upload Section */}
      <div className="p-6 border rounded-lg bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">העלאת קבצים</h3>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors duration-300 ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-gray-500">
            <UploadCloud className="w-12 h-12 mb-4" />
            <p className="font-semibold">גרור ושחרר קבצים לכאן, או לחץ לבחירה</p>
            <p className="text-sm mt-1">תומך ב-PDF, Word, PowerPoint, Excel, תמונות, וידאו, אודיו וטקסט.</p>
          </div>
        </div>
      </div>

      {/* Prompts Section */}
      <div className="p-6 border rounded-lg bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">הוראות והגדרות מותאמות אישית</h3>
        <textarea
          value={prompts}
          onChange={(e) => setPrompts(e.target.value)}
          placeholder="לדוגמה: ענה תמיד לתלמידים בטון מעודד. אם אינך יודע את התשובה, הפנה אותם למייל שלי..."
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 h-32 resize-y"
        />
        <p className="text-xs text-gray-500 mt-2">אלו הגדרות שישפיעו על טון הדיבור, האישיות וההתנהגות של הבוט.</p>
      </div>

      {/* URL Input Section */}
      <div className="p-6 border rounded-lg bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">הוספת קישורים (לסרטונים, מאמרים, וכו')</h3>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <input
            type="url"
            value={currentLink}
            onChange={(e) => setCurrentLink(e.target.value)}
            placeholder="הדבק כאן קישור..."
            className="flex-grow p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleAddLink} className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors font-semibold">
            הוסף קישור
          </button>
        </div>
      </div>

      {rejectedFiles.length > 0 && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <h3 className="font-bold">קבצים שנדחו:</h3>
            <ul>
                {rejectedFiles.map(({ file, errors }) => (
                    <li key={file.name}>{file.name} - {errors.map(e => e.message).join(', ')}</li>
                ))}
            </ul>
        </div>
      )}

      {(uploadedFiles.length > 0 || links.length > 0) && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold">בסיס הידע הנוכחי:</h3>
          {uploadedFiles.length > 0 && (
            <ul className="border rounded-lg overflow-hidden">
              {uploadedFiles.map((file: File, index: number) => (
                <li key={`file-${index}`} className="flex items-center justify-between p-4 bg-white border-b last:border-b-0">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <FileIcon className="w-6 h-6 text-gray-500" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-sm text-gray-500">({formatBytes(file.size)})</span>
                  </div>
                  <button onClick={() => removeFile(file.name)} className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {links.length > 0 && (
            <ul className="border rounded-lg overflow-hidden">
              {links.map((link: string, index: number) => (
                <li key={`link-${index}`} className="flex items-center justify-between p-4 bg-white border-b last:border-b-0">
                  {editingLink?.index === index ? (
                    <div className="flex-grow flex items-center gap-2">
                      <input
                        type="text"
                        value={editingLink.value}
                        onChange={(e) => setEditingLink({ ...editingLink, value: e.target.value })}
                        className="flex-grow p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') { updateLink(index, editingLink.value); setEditingLink(null); } else if (e.key === 'Escape') { setEditingLink(null); }}}
                      />
                      <button onClick={() => { updateLink(index, editingLink.value); setEditingLink(null); }} className="p-1 text-green-600 hover:text-green-800"><Check className="w-5 h-5" /></button>
                      <button onClick={() => setEditingLink(null)} className="p-1 text-red-600 hover:text-red-800"><X className="w-5 h-5" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse truncate">
                        <LinkIcon className="w-6 h-6 text-gray-500 flex-shrink-0" />
                        <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline truncate">{link}</a>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setEditingLink({ index, value: link })} className="p-1 text-gray-400 hover:text-blue-500 rounded-full transition-colors"><Edit className="w-5 h-5" /></button>
                        <button onClick={() => navigator.clipboard.writeText(link)} className="p-1 text-gray-400 hover:text-green-500 rounded-full transition-colors"><Copy className="w-5 h-5" /></button>
                        <button onClick={() => removeLink(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end items-center gap-4">
            {lastUpdated && !isUpdating && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-5 h-5" />
                <span>עודכן לאחרונה: {lastUpdated.toLocaleString('he-IL')}</span>
              </div>
            )}
            <button
              onClick={updateKnowledgeBase}
              disabled={isUpdating}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  מעדכן...
                </>
              ) : (
                'עדכן את בסיס הידע של הבוט'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotSettingsTab;
