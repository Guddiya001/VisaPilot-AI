const fs = require('fs');

const content = "'use client';\n" +
"\n" +
"import { useState, useRef, useEffect } from 'react';\n" +
"import { Send, Bot, User, Loader2, CheckCircle2, WifiOff, AlertCircle } from 'lucide-react';\n" +
"import { aiApi, authApi } from '@/lib/api';\n" +
"\n" +
"export default function AiChatPage() {\n" +
"  const [messages, setMessages] = useState([\n" +
"    { role: 'assistant', content: 'Hello! I am your AI career assistant. How can I help you today?' },\n" +
"  ]);\n" +
"  const [input, setInput] = useState('');\n" +
"  const [loading, setLoading] = useState(false);\n" +
"  const [ollamaStatus, setOllamaStatus] = useState(null);\n" +
"  const [statusLoading, setStatusLoading] = useState(true);\n" +
"  const messagesEndRef = useRef(null);\n" +
"\n" +
"  useEffect(() => { checkOllamaHealth(); }, []);\n" +
"  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);\n" +
"\n" +
"  async function checkOllamaHealth() {\n" +
"    setStatusLoading(true);\n" +
"    const result = await aiApi.health();\n" +
"    if (result.success && result.data) {\n" +
"      setOllamaStatus({ available: result.data.available, modelLoaded: result.data.modelLoaded, models: result.data.models });\n" +
"    } else {\n" +
"      setOllamaStatus({ available: false, modelLoaded: false, models: [] });\n" +
"    }\n" +
"    setStatusLoading(false);\n" +
"  }\n" +
"\n" +
"  async function handleSend() {\n" +
"    if (!input.trim() || loading) return;\n" +
"    const userMessage = input.trim();\n" +
"    setInput('');\n" +
"    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);\n" +
"    setLoading(true);\n" +
"    try {\n" +
"      const token = authApi.getToken();\n" +
"      if (!token) { setMessages((prev) => [...prev, { role: 'assistant', content: 'Please log in to use AI chat.' }]); setLoading(false); return; }\n" +
"      const result = await aiApi.chat(userMessage);\n" +
"      if (result.success && result.data) {\n" +
"        setMessages((prev) => [...prev, { role: 'assistant', content: result.data.reply || 'Done.' }]);\n" +
"      } else {\n" +
"        setMessages((prev) => [...prev, { role: 'assistant', content: 'How can I help with your job search?' }]);\n" +
"      }\n" +
"    } catch (err) {\n" +
"      setMessages((prev) => [...prev, { role: 'system', content: 'Error connecting to AI service.' }]);\n" +
"    } finally { setLoading(false); }\n" +
"  }\n" +
"\n" +
"  return (\n" +
"    <div className='flex flex-col h-[calc(100vh-8rem)] animate-fade-in'>\n" +
"      <div className='flex items-center justify-between'>\n" +
"        <div><h1 className='text-2xl font-bold text-gray-900'>AI Chat</h1><p className='text-gray-500 mt-1'>Get personalized career advice</p></div>\n" +
"        <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border text-xs'>\n" +
"          {statusLoading ? <span className='text-gray-500'>Checking Ollama...</span> : ollamaStatus?.available ? <span className='text-green-700'>Ollama - gemma3:4b ready</span> : <span className='text-red-600'>Ollama disconnected</span>}\n" +
"        </div>\n" +
"      </div>\n" +
"      <div className='flex-1 bg-white rounded-xl border mt-6 flex flex-col shadow-sm'>\n" +
"        <div className='flex-1 overflow-y-auto p-6 space-y-4'>\n" +
"          {messages.map((msg, i) => (\n" +
"            <div key={i} className={'flex items-start gap-3 ' + (msg.role === 'user' ? 'flex-row-reverse' : '')}>\n" +
"              {msg.role !== 'system' && <div className={'p-2 rounded-lg ' + (msg.role === 'assistant' ? 'bg-primary-100' : 'bg-gray-100')}>{msg.role === 'assistant' ? <Bot className='w-5 h-5 text-primary-600' /> : <User className='w-5 h-5 text-gray-600' />}</div>}\n" +
"              <div className={'rounded-2xl px-4 py-3 ' + (msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-800')}><p className='text-sm whitespace-pre-wrap'>{msg.content}</p></div>\n" +
"            </div>\n" +
"          ))}\n" +
"          {loading && <div className='flex items-start gap-3'><div className='p-2 rounded-lg bg-primary-100'><Bot className='w-5 h-5 text-primary-600' /></div><div className='bg-gray-50 rounded-2xl px-4 py-3'><div className='flex gap-1.5'><div className='w-2 h-2 bg-primary-400 rounded-full animate-bounce' style={{animationDelay:\\'0ms\\'}} /><div className='w-2 h-2 bg-primary-400 rounded-full animate-bounce' style={{animationDelay:\\'150ms\\'}} /><div className='w-2 h-2 bg-primary-400 rounded-full animate-bounce' style={{animationDelay:\\'300ms\\'}} /></div></div>}\n" +
"          <div ref={messagesEndRef} />\n" +
"        </div>\n" +
"        <div className='border-t p-4'>\n" +
"          <div className='flex gap-2'>\n" +
"            <input type='text' value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder='Ask about jobs...' disabled={loading} className='flex-1 px-4 py-2.5 rounded-lg border focus:outline-none disabled:opacity-50' />\n" +
"            <button onClick={handleSend} disabled={loading || !input.trim()} className='p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50'>{loading ? <Loader2 className='w-5 h-5 animate-spin' /> : <Send className='w-5 h-5' />}</button>\n" +
"          </div>\n" +
"          {ollamaStatus && !ollamaStatus.available && <p className='mt-2 text-xs text-amber-600'>Ollama not running. Start: ollama serve</p>}\n" +
"        </div>\n" +
"      </div>\n" +
"    </div>\n" +
"  );\n" +
"}\n";

fs.writeFileSync('apps/web/src/app/ai-chat/page.tsx', content);
console.log('Written ' + content.length + ' bytes successfully');
