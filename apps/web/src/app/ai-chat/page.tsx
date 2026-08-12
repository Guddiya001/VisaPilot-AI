'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, CheckCircle2, WifiOff, AlertCircle } from 'lucide-react';
import { aiApi, authApi } from '@/lib/api';

export default function AiChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm your AI career assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{
    available: boolean;
    modelLoaded: boolean;
    models: string[];
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => { checkOllamaHealth(); }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      (messagesEndRef.current as HTMLDivElement).scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function checkOllamaHealth() {
    setStatusLoading(true);
    const result = await aiApi.health();
    if (result.success && result.data) {
      setOllamaStatus({
        available: result.data.available,
        modelLoaded: result.data.modelLoaded,
        models: result.data.models,
      });
    } else {
      setOllamaStatus({ available: false, modelLoaded: false, models: [] });
    }
    setStatusLoading(false);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    try {
      const token = authApi.getToken();
      if (!token) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Please log in to use AI chat.' }]);
        setLoading(false);
        return;
      }
      const result = await aiApi.chat(userMessage);
      if (result.success && result.data?.reply) {
        const reply = result.data?.reply ?? '';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'How can I help with your job search?' }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'system', content: 'Error connecting to AI service.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
          <p className="text-gray-500 mt-1">Get personalized career advice</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border text-xs">
          {statusLoading ? (
            <span className="text-gray-500">Checking Ollama...</span>
          ) : ollamaStatus?.available ? (
            <span className="text-green-700">Ollama - gemma3:4b ready</span>
          ) : (
            <span className="text-red-600">Ollama disconnected</span>
          )}
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border mt-6 flex flex-col shadow-sm">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={'flex items-start gap-3 ' + (msg.role === 'user' ? 'flex-row-reverse' : '')}>
              {msg.role !== 'system' && (
                <div className={'p-2 rounded-lg ' + (msg.role === 'assistant' ? 'bg-primary-100' : 'bg-gray-100')}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5 text-primary-600" /> : <User className="w-5 h-5 text-gray-600" />}
                </div>
              )}
              <div className={'rounded-2xl px-4 py-3 ' + (msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-800')}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary-100">
                <Bot className="w-5 h-5 text-primary-600" />
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about jobs..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg border focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          {ollamaStatus && !ollamaStatus.available && (
            <p className="mt-2 text-xs text-amber-600">Ollama not running. Start: ollama serve</p>
          )}
        </div>
      </div>
    </div>
  );
}
