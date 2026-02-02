
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Zap } from 'lucide-react';
import { gemini } from '../services/geminiService';
import { ParsedData } from '../types';

export const AiAssistant: React.FC<{ data: ParsedData }> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
    { role: 'ai', text: '안녕하세요! 인포카 로그 분석 비서입니다. 차량 로그에서 궁금한 점을 빠르게 답변해 드릴게요.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const prompt = `
        다음 차량 로그 데이터를 바탕으로 질문에 답해줘. 
        저지연 모드(Flash Lite)를 사용 중이므로 명확하고 간결하게 답변해.
        
        로그 요약:
        - 기기: ${data.metadata.model}
        - 차량: ${data.metadata.carName}
        - 주요 이슈: ${data.diagnosis.issues.join(', ')}
        
        사용자 질문: ${userMsg}
      `;
      const response = await gemini.askFastAi(prompt);
      setMessages(prev => [...prev, { role: 'ai', text: response || "답변을 생성하지 못했습니다." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "오류가 발생했습니다. 나중에 다시 시도해주세요." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all group"
        >
          <Zap className="w-8 h-8 fill-current group-hover:animate-pulse" />
        </button>
      ) : (
        <div className="w-[380px] h-[550px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold">Fast Log Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)}><X className="w-5 h-5" /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                  m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1 opacity-60 uppercase text-[10px] font-bold">
                    {m.role === 'ai' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {m.role === 'ai' ? 'Infocar AI' : 'You'}
                  </div>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-2xl shadow-sm"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /></div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="로그에 대해 물어보세요..."
              className="flex-1 p-3 bg-slate-100 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              onClick={handleSend}
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
