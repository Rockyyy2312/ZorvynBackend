import { useState, useEffect, useRef } from 'react';
import { Bot, Send, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { askAdvisor, SUGGESTED_QUESTIONS } from '../api/geminiService';

function timeStr() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm **Nexo AI**, your personal financial advisor 🤖\n\nI have real-time access to your transaction data, income patterns, and spending habits. Ask me anything about your finances!\n\nTry: *\"How can I save more money?\"* or *\"What are my biggest expenses?\"*",
  time: timeStr(),
};

const CHAT_STORAGE_KEY = 'nexo_ai_chat';
const MAX_STORED_MESSAGES = 50;

function loadStoredMessages() {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const msgs = JSON.parse(stored);
      if (Array.isArray(msgs) && msgs.length > 0) return msgs;
    }
  } catch {}
  return [WELCOME_MESSAGE];
}

function persistMessages(msgs) {
  try {
    const toStore = msgs.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
  } catch {}
}

export default function AIChatPage() {
  const { user } = useAuth();
  const [messages, setMessages]   = useState(loadStoredMessages);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [context, setContext]     = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const messagesEndRef             = useRef(null);
  const textareaRef                = useRef(null);

  // Fetch financial context once on mount
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    setHasApiKey(!!(apiKey && apiKey !== 'YOUR_GEMINI_KEY_HERE'));
    loadContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 1) persistMessages(messages);
  }, [messages]);

  const loadContext = async () => {
    try {
      const [sumRes, catRes, monRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/categories'),
        api.get('/dashboard/monthly'),
      ]);
      setContext({
        user,
        summary:    sumRes.data,
        categories: catRes.data.data || {},
        monthly:    monRes.data.data || [],
      });
    } catch {
      // Context load failed — advisor still works without it
    }
  };

  const sendMessage = async (text = input.trim()) => {
    if (!text || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, time: timeStr() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome' && m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const reply = await askAdvisor(text, context || {}, history);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: reply, time: timeStr()
      }]);
    } catch (err) {
      let errMsg = 'Something went wrong. Please try again.';
      if (err.message === 'INVALID_API_KEY') {
        errMsg = '❌ Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY in .env and restart the dev server.';
      }
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: errMsg, time: timeStr(), isError: true
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    toast.success('Chat history cleared');
  };

  // Simple markdown-like renderer (bold + italic)
  const renderContent = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="ai-chat-page glass-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-avatar">
          <Bot size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Nexo AI Advisor</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span className="ai-status-dot" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {context ? 'Financial data loaded' : 'Loading your data...'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 'var(--radius-full)', background: hasApiKey ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: hasApiKey ? 'var(--color-income)' : 'var(--color-warning)', fontWeight: 600, border: `1px solid ${hasApiKey ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
            <Sparkles size={10} style={{ display: 'inline', marginRight: '4px' }} />
            {hasApiKey ? 'Gemini AI' : 'Smart Mode'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={clearChat} title="Clear conversation">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* API key banner */}
      {!hasApiKey && (
        <div className="api-key-banner">
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>Running in Smart Mode</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Add <code style={{ background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '4px' }}>VITE_GEMINI_API_KEY=your_key</code> to <code style={{ background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '4px' }}>.env</code> and restart for full AI responses
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className={`chat-avatar-mini ${msg.role === 'assistant' ? 'chat-avatar-ai' : 'chat-avatar-user'}`}>
              {msg.role === 'assistant' ? '🤖' : (user?.name?.[0] || 'U')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`chat-bubble ${msg.isError ? 'error' : ''}`}
                style={msg.isError ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' } : {}}
                dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
              />
              <p className="chat-bubble-time">{msg.time}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="chat-avatar-mini chat-avatar-ai">🤖</div>
            <div>
              <div className="chat-typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && (
        <div className="ai-suggestions">
          {SUGGESTED_QUESTIONS.map(q => (
            <button key={q} className="ai-suggestion-chip" onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="ai-chat-input-bar">
        <textarea
          ref={textareaRef}
          className="ai-chat-textarea"
          placeholder="Ask me anything about your finances..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className="ai-send-btn"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          title="Send (Enter)"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
