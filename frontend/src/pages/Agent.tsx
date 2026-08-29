import React, { useState, useRef, useEffect } from 'react';
import { PageContainer, SectionCard, LoadingSkeleton } from '../components/dashboard/ShellComponents';
import { queryCopilot, getRecordDetails } from '../api/copilot.api';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  Link2,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  X,
  FileText
} from 'lucide-react';

interface EvidenceData {
  chips: string[];
  related: Array<{ id: string; type: string; externalId: string }>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  evidence?: EvidenceData;
  createdAt: string;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your AI Finance Copilot. I have access to your normalized ledger database, reconciliation results, and cash forecasts. Ask me to audit anomalies or cash positions.',
      createdAt: new Date().toISOString()
    }
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [querying, setQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector Modal State
  const [inspectingRecord, setInspectingRecord] = useState<any | null>(null);
  const [inspectingLoading, setInspectingLoading] = useState(false);
  const [inspectingError, setInspectingError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, querying]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || querying) return;

    setError(null);
    setInput('');

    // Add user message to state
    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setQuerying(true);

    try {
      const res = await queryCopilot(text, conversationId);
      if (res.success && res.message) {
        setConversationId(res.conversationId);
        setMessages(prev => [...prev, {
          id: res.message.id,
          role: res.message.role,
          content: res.message.content,
          evidence: res.message.evidence,
          createdAt: res.message.createdAt
        }]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to get response.');
      setMessages(prev => [...prev, {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: "⚠️ I don't have enough verified data to answer this.",
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setQuerying(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    handleSend(q);
  };

  // Inspect Transaction from Evidence Chip
  const handleInspectChip = async (chipText: string) => {
    // Regex matches common transaction identifiers (e.g. TXN-1023, pay_P10001, setl_S10001, INV-1001)
    const cleaned = chipText.trim();
    const isTxn = /^(TXN-\d+|pay_\w+|setl_\w+|INV-\d+)$/i.test(cleaned);
    
    if (!isTxn) return; // ignore chips representing counts or aggregate values

    setInspectingError(null);
    setInspectingRecord(null);
    setInspectingLoading(true);

    try {
      const res = await getRecordDetails(cleaned);
      if (res.success && res.record) {
        setInspectingRecord(res.record);
      }
    } catch (err: any) {
      setInspectingError(err.response?.data?.error || `Transaction record "${cleaned}" could not be retrieved from the database.`);
      setInspectingRecord({ externalId: cleaned }); // mock wrap with ID to show popup
    } finally {
      setInspectingLoading(false);
    }
  };

  // Get active evidence chips from last assistant message
  const getActiveEvidence = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].evidence) {
        return messages[i].evidence;
      }
    }
    return null;
  };

  const activeEvidence = getActiveEvidence();

  const quickPrompts = [
    { label: 'Why is TXN-0401 mismatched?', text: 'Why is TXN-0401 mismatched?' },
    { label: 'What caused the largest exception?', text: 'What caused the largest exception?' },
    { label: 'Show me high-value unresolved transactions.', text: 'Show me high-value unresolved transactions.' },
    { label: 'Why is the settlement lower than payment?', text: 'Why is the settlement lower than payment?' },
    { label: 'What should I review first?', text: 'What should I review first?' }
  ];

  return (
    <PageContainer>
      
      {/* 1. Header Banner */}
      <div className="space-y-1 text-left mb-6">
        <h2 className="text-xl font-bold tracking-tight text-[#0B1726]">AI Controller</h2>
        <p className="text-xs text-[#667085] font-semibold">Use Groq AI to explain financial exceptions and answer finance questions using verified database context.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
        
        {/* LEFT COLUMN: CONVERSATION PANEL */}
        <div className="lg:col-span-2 bg-white border border-[#E4E7EC] rounded-2xl flex flex-col overflow-hidden shadow-2xs">
          
          {/* Messages Log area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F6F8FA] text-left">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${
                    isUser 
                      ? 'bg-neutral-100 border-neutral-200 text-neutral-600' 
                      : 'bg-[#2F6F73]/10 border-[#2F6F73]/20 text-[#2F6F73]'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Bubble */}
                  <div className="space-y-1.5">
                    <div className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed border shadow-3xs ${
                      isUser 
                        ? 'bg-[#2F6F73] text-white border-[#2F6F73]' 
                        : 'bg-white text-[#0B1726] border-[#E4E7EC]'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold block px-1">
                      {new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {querying && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-[#2F6F73]/10 border border-[#2F6F73]/20 flex items-center justify-center text-[#2F6F73] animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-[#E4E7EC] p-4 rounded-2xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#2F6F73] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#2F6F73] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#2F6F73] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Panel */}
          <div className="p-4 bg-white border-t border-[#E4E7EC] text-left space-y-2">
            <span className="text-[9px] font-bold text-[#667085] uppercase tracking-wider block">Quick Audit Questions</span>
            
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickQuestion(p.text)}
                  disabled={querying}
                  className="bg-[#F6F8FA] hover:bg-[#F2F4F7] disabled:opacity-50 border border-[#E4E7EC] text-[#0B1726] text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="p-4 border-t border-[#E4E7EC] bg-white flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={querying}
              placeholder="Ask a financial audit question..."
              className="flex-1 bg-[#F6F8FA] border border-[#E4E7EC] rounded-xl px-4 py-2.5 text-xs font-bold text-[#0B1726] focus:outline-none placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={querying || !input.trim()}
              className="bg-[#2F6F73] hover:bg-[#25575a] disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* RIGHT COLUMN: CONTEXT & EVIDENCE PANEL */}
        <div className="space-y-6 text-left">
          
          {/* Active Evidence Section */}
          <div className="bg-white border border-[#E4E7EC] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#F2F4F7] pb-3">
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#2F6F73]" />
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block">Audit Evidence</span>
              </div>
              <span className="bg-[#2F6F73]/15 text-[#2F6F73] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">Verified</span>
            </div>

            {activeEvidence && activeEvidence.chips.length > 0 ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  The following metrics represent verified rows linked directly to this query response. Click any transaction ID chip to inspect record details.
                </p>

                <div className="flex flex-wrap gap-2">
                  {activeEvidence.chips.map((chip, idx) => {
                    const isTransaction = /^(TXN-\d+|pay_\w+|setl_\w+|INV-\d+)$/i.test(chip);
                    return (
                      <span
                        key={idx}
                        onClick={() => isTransaction && handleInspectChip(chip)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          isTransaction
                            ? 'bg-[#2F6F73]/10 border-[#2F6F73]/20 text-[#2F6F73] cursor-pointer hover:bg-[#2F6F73]/20'
                            : 'bg-[#F6F8FA] border-[#E4E7EC] text-[#0B1726]'
                        }`}
                      >
                        {isTransaction && <Link2 className="w-3 h-3 flex-shrink-0" />}
                        <span>{chip}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <FileText className="w-7 h-7 text-gray-300" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">No Active Evidence</span>
                <p className="text-[9px] text-gray-400 font-semibold max-w-[200px]">Ask a question (e.g. click a quick prompt) to compile verified ledger metrics.</p>
              </div>
            )}
          </div>

          {/* Hallucination Safeguard panel */}
          <div className="bg-[#F6F8FA] border border-[#E4E7EC] rounded-2xl p-5 text-[10px] font-semibold text-gray-400 space-y-3 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-[#667085] uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#2F6F73]" />
              <span>Copilot Safeguards</span>
            </div>
            <p>
              This Copilot relies on a strictly bounded database context mapping pipeline. The model is constrained to facts present in the PostgreSQL table structure.
            </p>
            <p className="text-[#667085] font-bold">
              🔒 Hallucinated metrics are prevented. If transaction parameters or cash data do not exist, the assistant triggers a low-confidence notice block.
            </p>
          </div>

        </div>

      </div>

      {/* TRANSACTION INSPECTOR MODAL */}
      {(inspectingLoading || inspectingRecord || inspectingError) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#E4E7EC] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#0B1726] text-left">
            
            <div className="flex justify-between items-center bg-[#F6F8FA] px-5 py-4 border-b border-[#E4E7EC]">
              <div>
                <h3 className="text-xs font-bold text-[#0B1726] uppercase tracking-wider">Database Inspector</h3>
                <p className="text-[9px] text-[#667085] font-bold uppercase mt-0.5">Verified Record Detail</p>
              </div>
              <button 
                onClick={() => { setInspectingRecord(null); setInspectingLoading(false); setInspectingError(null); }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {inspectingLoading ? (
                <div className="flex items-center gap-2.5 py-4">
                  <div className="w-4 h-4 border-2 border-[#2F6F73] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-[#667085] font-bold">Querying ledger database...</span>
                </div>
              ) : inspectingError ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 text-[#C58B24] border border-amber-100 rounded-xl text-[10px] font-bold flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="block text-amber-800">Record Data Unavailable</span>
                      <p className="font-semibold text-[#C58B24]/90 font-mono text-[9px] leading-normal">{inspectingError}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
                    This reference was parsed as a transaction reference but could not be located in your normalized financial records.
                  </p>
                </div>
              ) : inspectingRecord ? (
                <div className="space-y-3.5 font-bold text-xs text-gray-500">
                  
                  <div className="flex justify-between items-center border-b border-[#F2F4F7] pb-2.5">
                    <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">Reference ID</span>
                    <span className="text-[#0B1726] font-mono">{inspectingRecord.externalId}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Record Type:</span>
                    <span className="bg-[#2F6F73]/15 text-[#2F6F73] px-2 py-0.5 rounded-full text-[9px] uppercase font-extrabold">{inspectingRecord.recordType}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Amount:</span>
                    <span className="text-[#0B1726] font-black text-sm">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: inspectingRecord.currency || 'INR' }).format(inspectingRecord.amount)}
                    </span>
                  </div>

                  {inspectingRecord.transactionDate && (
                    <div className="flex justify-between items-center">
                      <span>Transaction Date:</span>
                      <span className="text-[#0B1726] font-medium font-sans">
                        {new Date(inspectingRecord.transactionDate).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  )}

                  {inspectingRecord.description && (
                    <div className="flex flex-col gap-1 pt-1 border-t border-[#F2F4F7]">
                      <span className="text-[9px] text-[#667085] uppercase tracking-wider font-extrabold">Narration</span>
                      <span className="text-[#0B1726] font-medium text-[11px] leading-relaxed font-sans">{inspectingRecord.description}</span>
                    </div>
                  )}

                  {inspectingRecord.counterparty && (
                    <div className="flex justify-between items-center border-t border-[#F2F4F7] pt-2.5">
                      <span>Counterparty:</span>
                      <span className="text-[#0B1726] font-medium font-sans">{inspectingRecord.counterparty}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-[#F2F4F7] pt-2.5">
                    <span>Ledger Status:</span>
                    <span className="text-[#198754] font-extrabold flex items-center gap-1 uppercase text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#198754]" />
                      {inspectingRecord.status}
                    </span>
                  </div>

                </div>
              ) : null}
            </div>

            <div className="flex justify-end bg-[#F6F8FA] px-5 py-3 border-t border-[#E4E7EC]">
              <button
                type="button"
                onClick={() => { setInspectingRecord(null); setInspectingLoading(false); setInspectingError(null); }}
                className="bg-white border border-[#E4E7EC] hover:bg-[#F2F4F7] text-[#0B1726] text-[10px] font-bold px-4 py-2 rounded-xl cursor-pointer shadow-3xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </PageContainer>
  );
}
