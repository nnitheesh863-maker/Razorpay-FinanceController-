import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { sendMessageToAgent } from '../api/agent.api';
import type { ChatMessage } from '../api/agent.api';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  Trash2, 
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Layers
} from 'lucide-react';

const SUGGESTIONS = [
  { text: "Summarize the latest reconciliation run status", icon: Layers },
  { text: "Are there any critical exceptions requiring attention?", icon: AlertOctagon },
  { text: "What is the total unpaid invoice balance?", icon: TrendingUp },
  { text: "How can I improve the reconciliation match rate?", icon: Sparkles }
];

export function Agent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am **Antigravity Finance AI**, your virtual assistant. I have live access to the database metrics for reconciliation runs, invoices, transactions, and exceptions. Ask me anything about the system's financial status or general accounting principles!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Exclude system/unnecessary messages if needed, but we pass full thread
      const apiResponse = await sendMessageToAgent(newMessages);
      setMessages(prev => [...prev, apiResponse.data]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect to the Finance AI Agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hello! I am **Antigravity Finance AI**, your virtual assistant. I have live access to the database metrics for reconciliation runs, invoices, transactions, and exceptions. Ask me anything about the system's financial status or general accounting principles!"
      }
    ]);
    setErrorMsg(null);
  };

  // Basic formatter to render bold, bullet points, and newlines in HTML safely
  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, lineIdx) => {
      // Bold formatter (**text**)
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      // Handle list items
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      if (isBullet) {
        formattedLine = line.trim().replace(/^[-*]\s+/, '');
      }

      // Convert **bold** to <strong>
      const parts = [];
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(formattedLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(formattedLine.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-text-main">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < formattedLine.length) {
        parts.push(formattedLine.substring(lastIndex));
      }

      const finalLine = parts.length > 0 ? parts : formattedLine;

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-5 list-disc my-1 text-sm text-neutral-700 leading-relaxed">
            {finalLine}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="my-1.5 text-sm text-neutral-700 leading-relaxed min-h-[1rem]">
          {finalLine}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Finance AI Agent" 
        description="Interact with the smart copilot to analyze transactions, invoices, and run details."
        actions={
          <Button variant="outline" size="sm" onClick={handleClearChat} className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-danger-500" />
            <span>Clear Chat</span>
          </Button>
        }
      />

      <div className="flex flex-1 gap-6 overflow-hidden mt-2">
        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col bg-white border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          {/* AI Banner */}
          <div className="px-6 py-4 bg-primary-50/50 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-primary-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text-main text-sm flex items-center gap-1.5">
                  Antigravity Finance AI
                  <span className="inline-flex items-center rounded-full bg-success-50 px-1.5 py-0.5 text-xs font-medium text-success-600 ring-1 ring-inset ring-success-500/20">
                    <span className="w-1.5 h-1.5 bg-success-500 rounded-full mr-1 animate-pulse" />
                    Online
                  </span>
                </h3>
                <p className="text-xs text-text-muted">Real-time Financial Advisor • Powered by Groq AI</p>
              </div>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50/30">
            {messages.map((message, idx) => {
              const isAssistant = message.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-3xl ${isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white ${
                    isAssistant ? 'bg-primary-600' : 'bg-neutral-800'
                  }`}>
                    {isAssistant ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  </div>

                  <div className={`flex flex-col space-y-1 ${isAssistant ? 'items-start' : 'items-end'}`}>
                    <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                      isAssistant 
                        ? 'bg-white border border-border-subtle text-text-main' 
                        : 'bg-primary-600 text-white font-medium'
                    }`}>
                      {isAssistant ? (
                        <div className="space-y-0.5">
                          {formatMessageContent(message.content)}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted px-1">
                      {isAssistant ? 'AI Assistant' : 'You'}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 mr-auto max-w-3xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white bg-primary-600">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="bg-white border border-border-subtle rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-2.5 h-2.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2.5 h-2.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2.5 h-2.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted px-1">AI Assistant is thinking...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-lg text-sm text-danger-600 text-center max-w-lg mx-auto">
                {errorMsg}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (if no user messages started or just at bottom) */}
          {messages.length === 1 && (
            <div className="px-6 py-4 bg-white border-t border-border-subtle">
              <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Suggested Questions</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTIONS.map((sug, sIdx) => {
                  const SugIcon = sug.icon;
                  return (
                    <button
                      key={sIdx}
                      onClick={() => handleSend(sug.text)}
                      className="flex items-center gap-3 text-left px-3.5 py-2.5 border border-border-subtle rounded-lg text-xs font-medium text-text-main bg-neutral-50/50 hover:bg-primary-50/30 hover:border-primary-200 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-md bg-white border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-primary-600 transition-colors">
                        <SugIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1 line-clamp-1">{sug.text}</span>
                      <ArrowRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-4 bg-white border-t border-border-subtle">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Ask about reconciliation rates, unpaid invoices, or general finance..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 min-w-0 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-border-subtle focus:border-primary-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-text-muted disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl flex items-center gap-1.5 px-4"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Info Sidebar panel */}
        <div className="w-80 hidden xl:flex flex-col gap-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h4 className="font-semibold text-text-main text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                AI Copilot Context
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                This AI Agent has access to current financial metrics retrieved from the database including reconciliation rates, outstanding balances, and transactional breakdowns.
              </p>
              <div className="h-px bg-border-subtle" />
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">Available Modules</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-medium rounded-full">Reconciliation Runs</span>
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-medium rounded-full">Transactions</span>
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-medium rounded-full">Invoices</span>
                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-medium rounded-full">Exceptions</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">Model Used</span>
                  <p className="text-xs text-text-main font-semibold mt-0.5">groq/compound</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">Provider</span>
                  <p className="text-xs text-text-main font-semibold mt-0.5">Groq Cloud API</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
