
import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Video, Wand2, Download, Loader2, Square, Maximize, AlertCircle, Trash2 } from 'lucide-react';
import { gemini } from '../services/geminiService';

export const AiMediaLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GEN_IMG' | 'EDIT_IMG' | 'VEO'>('GEN_IMG');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [config, setConfig] = useState({ aspectRatio: '1:1', size: '1K' as any });
  const [uploadedImage, setUploadedImage] = useState<{data: string, mime: string} | null>(null);

  const checkKeyAndRun = async (action: () => Promise<void>) => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
      }
    }
    setLoading(true);
    try {
      await action();
    } catch (e: any) {
      alert("오류 발생: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = () => checkKeyAndRun(async () => {
    const url = await gemini.generateImage(prompt, { aspectRatio: config.aspectRatio, imageSize: config.size });
    setResult(url);
  });

  const handleEditImage = () => checkKeyAndRun(async () => {
    if (!uploadedImage) return alert("이미지를 업로드해주세요.");
    const url = await gemini.editImage(prompt, uploadedImage.data, uploadedImage.mime);
    if (typeof url === 'string') setResult(url);
  });

  const handleGenerateVideo = () => checkKeyAndRun(async () => {
    const url = await gemini.generateVideo(prompt, { 
      aspectRatio: config.aspectRatio as any,
      image: uploadedImage ? { data: uploadedImage.data, mimeType: uploadedImage.mime } : undefined
    });
    setResult(url);
  });

  const onImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setUploadedImage({ data: base64, mime: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-3xl shadow-xl text-white">
        <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-yellow-300" /> AI Media Lab
        </h2>
        <p className="opacity-90">차량 관련 포스터 제작부터 홍보 영상까지, Gemini와 Veo로 한번에.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-100">
              <button onClick={() => setActiveTab('GEN_IMG')} className={`flex-1 p-4 text-xs font-bold transition-all ${activeTab === 'GEN_IMG' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>이미지 생성</button>
              <button onClick={() => setActiveTab('EDIT_IMG')} className={`flex-1 p-4 text-xs font-bold transition-all ${activeTab === 'EDIT_IMG' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>이미지 편집</button>
              <button onClick={() => setActiveTab('VEO')} className={`flex-1 p-4 text-xs font-bold transition-all ${activeTab === 'VEO' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>비디오 (Veo)</button>
            </div>

            <div className="p-6 space-y-4">
              {(activeTab === 'EDIT_IMG' || activeTab === 'VEO') && (
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase">참조 이미지 업로드</label>
                   <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer">
                      <input type="file" accept="image/*" onChange={onImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {uploadedImage ? (
                        <div className="flex items-center justify-between gap-2">
                           <span className="text-xs text-indigo-600 font-bold truncate">이미지 업로드됨</span>
                           <button onClick={() => setUploadedImage(null)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                           <ImageIcon className="w-6 h-6" />
                           <span className="text-[10px]">클릭하여 이미지 선택</span>
                        </div>
                      )}
                   </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">프롬프트 입력</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32"
                  placeholder={activeTab === 'GEN_IMG' ? "예: 네온 사인이 반짝이는 미래형 스포츠카, 사이버펑크 스타일" : "수정 사항을 입력하세요 (예: 배경을 비오는 밤으로 바꿔줘)"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Square className="w-3 h-3" /> 비율</label>
                  <select 
                    value={config.aspectRatio}
                    onChange={(e) => setConfig({...config, aspectRatio: e.target.value})}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Wide</option>
                    <option value="9:16">9:16 Portrait</option>
                    <option value="4:3">4:3 Standard</option>
                  </select>
                </div>
                {activeTab === 'GEN_IMG' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Maximize className="w-3 h-3" /> 해상도</label>
                    <select 
                      value={config.size}
                      onChange={(e) => setConfig({...config, size: e.target.value as any})}
                      className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none"
                    >
                      <option value="1K">1K (Basic)</option>
                      <option value="2K">2K (High)</option>
                      <option value="4K">4K (Ultra)</option>
                    </select>
                  </div>
                )}
              </div>

              <button 
                onClick={activeTab === 'GEN_IMG' ? handleGenerateImage : activeTab === 'EDIT_IMG' ? handleEditImage : handleGenerateVideo}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (activeTab === 'VEO' ? <Video className="w-5 h-5" /> : <Wand2 className="w-5 h-5" />)}
                {loading ? "생성 중..." : "AI 실행하기"}
              </button>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-amber-800 text-xs">
             <AlertCircle className="w-5 h-5 shrink-0" />
             <p>이 기능은 고급 AI 모델을 사용하므로, <strong>유료 프로젝트의 API Key</strong>가 필요합니다. 상단의 키 아이콘을 클릭하여 설정하세요.</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-slate-900 rounded-2xl min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden shadow-2xl border border-slate-800">
            {loading ? (
              <div className="flex flex-col items-center gap-4 text-white p-8 text-center animate-pulse">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                <div>
                  <h3 className="text-lg font-bold">생성물을 굽는 중입니다...</h3>
                  <p className="text-slate-400 text-sm mt-2">비디오 생성의 경우 최대 2~3분이 소요될 수 있습니다.<br/>이 페이지를 떠나지 마세요.</p>
                </div>
              </div>
            ) : result ? (
              activeTab === 'VEO' ? (
                <video src={result} controls className="w-full h-full object-contain" />
              ) : (
                <div className="group relative w-full h-full flex items-center justify-center">
                  <img src={result} className="max-w-full max-h-full object-contain" alt="AI Generated" />
                  <a href={result} download="infocar-ai-media.png" className="absolute top-4 right-4 bg-white/20 backdrop-blur hover:bg-white/40 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all">
                    <Download className="w-6 h-6" />
                  </a>
                </div>
              )
            ) : (
              <div className="text-center text-slate-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">프롬프트를 입력하고 좌측의 버튼을 누르세요.</p>
                <p className="text-[10px] mt-1 opacity-60 italic">결과물이 이곳에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
