import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FormInput, Loader, Sparkles } from 'lucide-react';
import { aiApi } from '../services/api';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `Hello! I'm your AD assistant. I can help you:

• Understand what information is needed to create a user
• Explain what each field does in Active Directory  
• Guide you through the creation process
• Answer questions about Active Directory

When you're ready to create a user, you can switch to the **Form** view using the toggle at the top, or just tell me the details here and I'll help you fill it in.

What would you like to do?`
};

const s = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxWidth: '860px',
    margin: '0 auto',
    width: '100%',
    padding: '0 16px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  messageRow: (role) => ({
    display: 'flex',
    gap: '12px',
    flexDirection: role === 'user' ? 'row-reverse' : 'row',
    animation: 'fadeIn 0.2s ease',
  }),
  avatar: (role) => ({
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
    border: '1px solid var(--border)',
  }),
  bubble: (role) => ({
    maxWidth: '78%',
    padding: '12px 16px',
    borderRadius: role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
    background: role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
    border: `1px solid ${role === 'user' ? 'transparent' : 'var(--border)'}`,
    fontSize: '14px',
    lineHeight: '1.6',
    color: role === 'user' ? '#fff' : 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '4px 12px 12px 12px',
    width: 'fit-content',
  },
  dot: (i) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--text-muted)',
    animation: 'pulse 1.2s ease infinite',
    animationDelay: `${i * 0.2}s`,
  }),
  inputArea: {
    padding: '16px 0 24px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    minHeight: '44px',
    maxHeight: '140px',
    overflowY: 'auto',
    padding: '11px 14px',
    borderRadius: '10px',
    fontFamily: 'var(--font-sans)',
    fontSize: '14px',
  },
  sendBtn: (disabled) => ({
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: disabled ? 'var(--bg-elevated)' : 'var(--accent)',
    color: disabled ? 'var(--text-muted)' : '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    flexShrink: 0,
    border: '1px solid var(--border)',
    transition: 'all 120ms ease',
  }),
  hint: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  hintBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 120ms ease',
  },
};

const QUICK_PROMPTS = [
  "What fields are required to create a user?",
  "What is a UPN?",
  "How are usernames generated?",
  "What is an OU?",
];

export default function ChatInterface({ onSwitchToForm }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(updated.map(m => ({ role: m.role, content: m.content })));
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I couldn't process that. Error: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={s.container}>
      {/* Messages */}
      <div style={s.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={s.messageRow(msg.role)}>
            <div style={s.avatar(msg.role)}>
              {msg.role === 'user'
                ? <User size={14} color="#fff" />
                : <Sparkles size={14} color="var(--text-accent)" />
              }
            </div>
            <div style={s.bubble(msg.role)}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={s.messageRow('assistant')}>
            <div style={s.avatar('assistant')}>
              <Sparkles size={14} color="var(--text-accent)" />
            </div>
            <div style={s.typingIndicator}>
              {[0, 1, 2].map(i => <span key={i} style={s.dot(i)} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={s.inputArea}>
        {/* Quick Prompts */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {QUICK_PROMPTS.map((p) => (
            <button key={p} style={s.hintBtn} onClick={() => sendMessage(p)}>
              {p}
            </button>
          ))}
          <button
            style={{ ...s.hintBtn, color: 'var(--text-accent)', borderColor: 'var(--border-focus)' }}
            onClick={onSwitchToForm}
          >
            <FormInput size={12} />
            Switch to Form
          </button>
        </div>

        {/* Text Input */}
        <div style={s.inputRow}>
          <textarea
            ref={textareaRef}
            style={s.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about AD user creation... (Enter to send, Shift+Enter for new line)"
            rows={1}
          />
          <button
            style={s.sendBtn(!input.trim() || loading)}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
