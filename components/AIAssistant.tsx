
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Minimize2 } from 'lucide-react';
import { generateCrmAssistance } from '../lib/gemini';

interface AIAssistantProps {
  context: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateCrmAssistance(userMessage, context);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-[#006344] to-[#10B981] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        {isOpen ? <Minimize2 size={24} /> : <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 w-96 h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-[60] animate-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="bg-[#006344] p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-black text-lg">Marvel AI</h3>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  En ligne
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto text-[#006344]">
                  <Sparkles size={32} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800">Comment puis-je vous aider ?</h4>
                  <p className="text-sm text-slate-500 px-8">"Rédige un mail de suivi pour Marie & Jean" ou "Quelle est la progression moyenne des projets ?"</p>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-[#006344] text-white shadow-lg' 
                    : 'bg-white text-slate-700 shadow-sm border border-slate-100'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {m.role === 'ai' ? <Bot size={14} className="text-[#006344]" /> : <User size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                      {m.role === 'ai' ? 'Marvel AI' : 'Vous'}
                    </span>
                  </div>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
                   <div className="w-2 h-2 bg-slate-200 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                   <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Posez votre question..."
                className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#006344]/10 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1.5 p-2 bg-[#006344] text-white rounded-xl hover:bg-[#005036] disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
