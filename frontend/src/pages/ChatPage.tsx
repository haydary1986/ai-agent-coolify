import { useState } from 'react';
import { Send, Paperclip, Bot, User } from 'lucide-react';

interface ChatPageProps {
  systemName: string;
  systemLogo: string;
}

export default function ChatPage({ systemName, systemLogo }: ChatPageProps) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: `مرحباً بك في ${systemName}! أنا الوكيل الذكي الخاص بك، كيف يمكنني مساعدتك اليوم؟` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.response || data.error }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'عذراً، حدث خطأ في الاتصال بالخادم.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="sidebar glass-panel">
        <div className="sidebar-header">
          {systemLogo ? <img src={systemLogo} alt="Logo" style={{width: 32, height: 32, borderRadius: '50%'}} /> : <Bot size={28} />}
          <span>{systemName}</span>
        </div>
        <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem'}}>المحادثات السابقة</div>
        {/* Placeholder for history */}
        <div style={{padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', cursor: 'pointer'}}>
          محادثة جديدة
        </div>
      </div>

      <div className="main-chat">
        <div className="chat-history">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
              <div style={{display: 'flex', gap: '0.75rem', alignItems: 'flex-start'}}>
                {msg.role === 'user' ? <User size={20} color="#9ca3af" /> : <Bot size={20} color="#818cf8" />}
                <div style={{flex: 1, whiteSpace: 'pre-wrap'}} dir="auto">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-bubble message-ai">
               <div className="typing-indicator">
                 <div className="typing-dot"></div>
                 <div className="typing-dot"></div>
                 <div className="typing-dot"></div>
               </div>
            </div>
          )}
        </div>

        <div className="chat-input-container">
          <div className="input-box glass-panel">
            <button className="icon-btn"><Paperclip size={20} /></button>
            <input 
              className="chat-input" 
              placeholder="اكتب رسالتك لـ Gemma..." 
              dir="auto"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="icon-btn send-btn" onClick={handleSend}><Send size={18} /></button>
          </div>
          <div style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            يمكن أن يرتكب {systemName} أخطاء. يرجى التحقق من المعلومات المهمة.
          </div>
        </div>
      </div>
    </>
  );
}
