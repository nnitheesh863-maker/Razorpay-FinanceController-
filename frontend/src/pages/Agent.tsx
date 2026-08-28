import { useState, useRef, useEffect } from 'react';
import { sendMessageToAgent } from '../api/agent.api';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  Info,
  Shield,
  HelpCircle
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `### ✦ Razorpay Finance AI Assistant\nWelcome! I am your real-time **AI Finance Controller**. Backed by your Postgres ledger database and powered by Groq, I can investigate exceptions, auditing logs, and analyze gateway payouts.\n\n**Common things you can ask me:**\n- Investigate discrepancies in **Settlement SET-1001**\n- Audit outstanding status on **Invoice INV-1001**\n- Calculate match rates and exceptions in our latest reconciliation runs`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await sendMessageToAgent(chatHistory);
      if (response.success && response.data) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.content
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **AI Service Error:** Unable to connect to Groq processing services. Verify your \`GROQ_API_KEY\` environment variables.`
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Connection Error:** ${err.message || 'Failed to communicate with AI server.'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Render markdown with custom tags for headings and checklists
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xs font-bold text-gray-900 mt-3 mb-1.5">{line.substring(4)}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-[11px] font-bold text-gray-800 mt-2 mb-1 uppercase tracking-wider">{line.substring(5)}</h4>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="ml-4 list-disc text-neutral-700 leading-normal text-xs">{line.substring(2)}</li>;
      }
      if (line.startsWith('*Audit Confidence:*')) {
        return <p key={idx} className="text-[10px] text-gray-400 font-semibold mt-3 pt-2 border-t border-gray-100">{line}</p>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={idx} className="font-bold text-gray-900 mt-1">{line.replace(/\*\*/g, '')}</p>;
      }
      return <p key={idx} className="text-xs text-neutral-800 leading-normal mb-1">{line}</p>;
    });
  };

  return (
    <div className="space-y-6 text-left flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto">
      {/* Overview/Shield info strip */}
      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-2xs flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Enterprise AI Controller</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Active: Groq Llama-3.3-70b-specdec</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-100 text-green-700 rounded-full text-[9px] font-bold">
          <Shield className="w-3.5 h-3.5" />
          <span>Server Protected</span>
        </div>
      </div>

      {/* Chat Messages Panel */}
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-2xs p-5 overflow-y-auto space-y-4 min-h-0">
        {messages.map((m, idx) => (
          <div 
            key={idx} 
            className={`flex gap-3 max-w-3xl ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              m.role === 'user' 
                ? 'bg-[#0048ff]/10 text-[#0048ff] border border-[#0048ff]/20' 
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`p-4 rounded-2xl text-xs space-y-1 ${
              m.role === 'user' 
                ? 'bg-[#0048ff] text-white border border-[#0048ff]' 
                : 'bg-neutral-50/80 border border-neutral-100 text-neutral-800'
            }`}>
              {m.role === 'user' ? <p className="leading-relaxed font-semibold">{m.content}</p> : renderMessageContent(m.content)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-neutral-50/80 border border-neutral-100 p-4 rounded-2xl text-xs flex items-center gap-2 text-gray-400 font-semibold italic">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0048ff]" />
              AI agent auditing ledger context details...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Chips */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        {[
          'Investigate Settlement SET-1001 details',
          'Audit Outstanding Invoice INV-1001 status',
          'Show matching rates for latest reconciliation run'
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={loading}
            className="text-[10px] font-bold text-gray-500 hover:text-[#0048ff] hover:bg-[#eff6ff] border border-gray-200 hover:border-[#0048ff] px-3 py-1.5 rounded-lg bg-white cursor-pointer disabled:opacity-50 transition-all shadow-3xs"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Message Input strip */}
      <div className="bg-white p-3.5 border border-gray-100 rounded-2xl shadow-2xs flex gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Ask AI Finance Controller to investigate settlements, audit invoices, or count discrepancies..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(input); }}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0048ff]/25 focus:border-[#0048ff] bg-neutral-50/50 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          className="bg-[#0048ff] hover:bg-[#003be0] text-white p-3 rounded-xl cursor-pointer disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
