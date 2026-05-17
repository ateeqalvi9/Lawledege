import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Volume2, VolumeX, ArrowLeft, ShieldAlert } from 'lucide-react';
import RagAvatar from '../../Components/RagAvatar';
import { lawledgeAgent } from './GroqService';
import { directoryData as directory } from "../../data/directoryData";

const AgentInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [avatarState, setAvatarState] = useState('idle');
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const scrollRef = useRef(null);
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text) => {
    if (!text || !synthesis) return;
    
    // Stop any existing speech
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => {
      setAvatarState('speaking');
    };
    utterance.onend = () => {
      setAvatarState('idle');
    };
    utterance.onerror = () => {
      setAvatarState('idle');
    };
    
    if (isTtsEnabled) {
      synthesis.speak(utterance);
    } else {
      // If TTS is disabled, we still want the avatar to "speak" for a bit 
      setAvatarState('speaking');
      setTimeout(() => setAvatarState('idle'), 3000);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || avatarState === 'thinking') return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAvatarState('thinking');

    try {
      const response = await lawledgeAgent.getChatResponse([...messages, userMessage]);
      const assistantMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
      
      speak(response);
    } catch (error) {
      console.error(error);
      setAvatarState('idle');
    }
  };

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content;

  return (
    <div className="flex flex-col h-full bg-white font-sans text-slate-900 overflow-hidden relative min-h-[70vh]">
      {/* Premium Header */}
      <header className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-400 rounded-xl shadow-lg shadow-amber-400/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter text-slate-900 italic">LAWLEDGE GUIDE</h1>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Multan Premium Protocol</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setMessages([])}
            className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
            title="Clear Chat"
          >
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
          <button 
            onClick={() => setIsTtsEnabled(!isTtsEnabled)}
            className={`p-2 rounded-xl transition-all shadow-sm ${isTtsEnabled ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            {isTtsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Experience Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative bg-gradient-to-b from-white to-amber-50/30">
        {/* Background Decor */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] bg-amber-400/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Dynamic Avatar & Response Area */}
        <div className="px-6 pt-6 pb-4 md:pt-10 md:pb-8 flex flex-col md:flex-row items-center justify-center relative z-10 shrink-0 gap-6 md:gap-16">
          <div className="relative">
            <RagAvatar state={avatarState} />
            
            {/* Thinking Indicator */}
            <AnimatePresence>
              {avatarState === 'thinking' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-6 left-0 w-full flex justify-center space-x-1"
                >
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
                      className="w-2 h-2 bg-amber-400 rounded-full"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex flex-col items-center md:items-start max-w-full md:max-w-md lg:max-w-lg">
            {/* Animated Speech Bubble */}
            <AnimatePresence mode="wait">
              {avatarState === 'speaking' && lastAssistantMessage ? (
                <motion.div 
                  key="speech-bubble"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, scale: 0.95 }}
                  className="bg-white border-2 border-amber-400 p-6 md:p-8 rounded-[2.5rem] rounded-tl-none md:rounded-bl-none shadow-2xl z-20 max-h-[35vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar relative"
                >
                  {/* Speech Anchor Triangle */}
                  <div className="hidden md:block absolute top-8 -left-3 w-6 h-6 bg-white border-l-2 border-b-2 border-amber-400 rotate-45 z-[-1]" />
                  <div className="md:hidden absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-l-2 border-t-2 border-amber-400 rotate-45 z-[-1]" />
                  
                  <p className="text-sm md:text-base font-black text-slate-800 leading-relaxed italic">
                    {lastAssistantMessage}
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="status-indicator"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-8 py-3 bg-white/80 backdrop-blur-sm border border-amber-200 rounded-full shadow-xl shadow-amber-900/5 mt-4 md:mt-0"
                >
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-amber-600 block text-center">
                    {avatarState === 'idle' ? 'Ready to Assist' : avatarState === 'thinking' ? 'Analyzing Statutes...' : 'Consulting Records'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat History */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth custom-scrollbar relative z-10"
        >
          {messages.length === 0 && (
            <div className="text-center py-10 space-y-6">
              <div className="max-w-xs mx-auto space-y-2">
                <p className="text-amber-600 text-xs font-black uppercase tracking-widest">Protocol Active</p>
                <p className="text-slate-500 text-sm font-medium leading-relaxed italic">
                  "I am your Lawledge Guide. Ask me about the CP Act 2005, Article 25A, or local civic landmarks in Multan."
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-sm mx-auto">
                <button 
                  onClick={() => { setInput("What are consumer rights in Punjab?"); handleSend(); }}
                  className="px-5 py-3 bg-white border-2 border-amber-100 rounded-2xl text-[11px] font-black text-amber-700 hover:border-amber-400 hover:bg-amber-50 transition-all text-left flex items-center justify-between group"
                >
                  <span>Consumer Rights</span>
                  <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Send className="w-3 h-3" />
                  </div>
                </button>
                <button 
                  onClick={() => { setInput("Animal welfare laws in Pakistan"); handleSend(); }}
                  className="px-5 py-3 bg-white border-2 border-amber-100 rounded-2xl text-[11px] font-black text-amber-700 hover:border-amber-400 hover:bg-amber-50 transition-all text-left flex items-center justify-between group"
                >
                  <span>Animal Welfare</span>
                  <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Send className="w-3 h-3" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`
                max-w-[90%] px-6 py-4 rounded-[2.5rem] text-sm leading-relaxed relative
                ${msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-900/10' 
                  : 'bg-white border-2 border-amber-50 text-slate-800 rounded-tl-none shadow-md shadow-amber-900/5'}
              `}>
                <div className="prose prose-sm prose-slate max-w-none">
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <div className="mt-3 pt-3 border-t border-amber-50 flex items-center justify-between">
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Official Record</span>
                    <button 
                      onClick={() => speak(msg.content)}
                      className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-400 transition-colors"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div className="h-10 shrink-0" />
        </div>
      </main>

      {/* Input Section */}
      <footer className="p-6 bg-white border-t border-amber-100 relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <form 
          onSubmit={handleSend}
          className="relative flex items-center max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Lawledge... e.g. Hussain Agahi heritage"
            className="w-full bg-slate-50 border-2 border-slate-50 rounded-[2rem] px-8 py-5 pr-20 text-sm font-bold focus:outline-none focus:border-amber-400 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
          />
          <div className="absolute right-3 flex space-x-1">
            <button
              type="submit"
              disabled={!input.trim() || avatarState === 'thinking'}
              className="w-12 h-12 bg-amber-400 text-white rounded-full shadow-lg shadow-amber-400/40 disabled:opacity-50 disabled:shadow-none hover:bg-amber-500 transition-all active:scale-90 flex items-center justify-center transform"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          </div>
        </form>
        <p className="text-center mt-4 text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] font-mono italic">
          Multan Digital Civic Infrastructure • v2.0.1
        </p>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #fef3c7;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default AgentInterface;
