
import React from 'react';
import { UploadCloud, FileText, FileArchive } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded }) => {
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileLoaded(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoaded(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Infocar 로그 분석</h1>
        <p className="text-slate-500">OBD2 스캐너 로그(.txt) 또는 ZIP 압축 파일을 분석합니다.</p>
      </div>

      <div 
        className="w-full max-w-2xl p-12 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer shadow-sm group"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <div className="flex flex-col items-center pointer-events-none">
          <div className="p-4 bg-slate-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
            <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">로그 파일을 이곳에 드롭하세요</h3>
          <p className="text-slate-500 text-sm mb-6">지원 형식: .txt, .log, .zip (Android/iOS)</p>
          <div className="flex gap-3">
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-medium">
                <FileText className="w-4 h-4" /> 텍스트
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-md text-sm font-medium">
                <FileArchive className="w-4 h-4" /> ZIP 압축
             </div>
          </div>
        </div>
        <input 
          id="fileInput" 
          type="file" 
          className="hidden" 
          accept=".txt,.log,.zip" 
          onChange={onInputChange}
        />
      </div>
    </div>
  );
};