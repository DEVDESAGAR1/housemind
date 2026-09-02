import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  ShieldCheck,
  Building,
  CreditCard,
  Wrench,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  HouseholdProfile,
  HouseholdExpense,
  HomeAsset,
  ChatMessage,
  ConversationSummary,
} from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface CopilotViewProps {
  profile: HouseholdProfile | null;
  expenses: HouseholdExpense[];
  assets: HomeAsset[];
  onNavigateTab: (tab: string) => void;
}

const STARTER_PROMPTS = [
  {
    category: 'Finances',
    icon: CreditCard,
    color: 'emerald',
    prompts: [
      'Summarize our total monthly and annual recurring household expenses.',
      'Which bills are upcoming or need immediate payment attention?',
      'How can we reduce our utility and recurring services costs?',
    ],
  },
  {
    category: 'Assets & Maintenance',
    icon: Wrench,
    color: 'amber',
    prompts: [
      'Which home appliances are approaching the end of their lifespan or warranty?',
      'Create a preventative maintenance checklist for our heating and major equipment.',
      'What is the estimated replacement budget needed over the next 3-5 years?',
    ],
  },
  {
    category: 'Energy & Efficiency',
    icon: Building,
    color: 'indigo',
    prompts: [
      'Given our square footage and heating type, what energy efficiency steps should we take?',
      'Assess our household operational resilience and critical equipment.',
    ],
  },
];

export const CopilotView: React.FC<CopilotViewProps> = ({
  profile,
  expenses,
  assets,
  onNavigateTab,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState<ConversationSummary | null>(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoadingConvs(true);
      const list = await api.getCopilotConversations();
      setConversations(list);
    } catch (err: any) {
      console.error('Failed to load copilot conversations:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  };

  // Switch or load a specific conversation
  const handleSelectConversation = async (convId: string) => {
    if (convId === activeConversationId) return;
    try {
      setIsLoading(true);
      setChatError(null);
      setActiveConversationId(convId);
      const detail = await api.getCopilotConversation(convId);
      setMessages(detail.messages || []);
    } catch (err: any) {
      console.error('Failed to load conversation messages:', err);
      setChatError('Failed to load conversation history.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start a fresh conversation
  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setChatError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Prompt delete confirmation modal
  const handleDeleteConversation = (e: React.MouseEvent, conv: ConversationSummary) => {
    e.stopPropagation();
    setDeletingConv(conv);
  };

  const handleConfirmDeleteConversation = async () => {
    if (!deletingConv) return;
    try {
      setIsDeletingConv(true);
      await api.deleteCopilotConversation(deletingConv.id);
      setConversations((prev) => prev.filter((c) => c.id !== deletingConv.id));
      if (activeConversationId === deletingConv.id) {
        handleNewConversation();
      }
      setDeletingConv(null);
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      setChatError('Failed to delete conversation.');
    } finally {
      setIsDeletingConv(false);
    }
  };

  // Send message to Gemini via backend
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setInputText('');
    setChatError(null);

    const userMsgId = 'temp-' + Date.now();
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.sendCopilotChat({
        message: query,
        conversationId: activeConversationId || undefined,
      });

      const assistantMessage: ChatMessage = {
        id: 'resp-' + Date.now(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        suggestedQuestions: response.suggestedQuestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!activeConversationId && response.conversationId) {
        setActiveConversationId(response.conversationId);
      }

      // Refresh conversations list to update titles/ordering
      loadConversations();
    } catch (err: any) {
      console.error('Copilot chat error:', err);
      const errMsg = err.message || 'Failed to receive reply from HouseMind Copilot.';
      setChatError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Total monthly calculated for grounding badge
  const monthlyExpensesTotal = expenses
    .reduce((acc, curr) => {
      if (curr.frequency === 'monthly') return acc + curr.amount;
      if (curr.frequency === 'quarterly') return acc + curr.amount / 3;
      if (curr.frequency === 'annual') return acc + curr.amount / 12;
      return acc;
    }, 0)
    .toFixed(0);

  return (
    <div className="space-y-6">
      {/* 1. Header & Grounding Context Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                HouseMind Copilot
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Gemini 3.7 Intelligence
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Grounded on your verified household database, appliances, and recurring bills.
              </p>
            </div>
          </div>
        </div>

        {/* Live Grounding Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition"
            title="Current Home Profile"
          >
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium truncate max-w-[120px]">
              {profile?.homeName || 'Maplewood'}
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('expenses')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition"
            title="Expenses Grounded"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              <strong className="text-slate-900">{expenses.length}</strong> Expenses (
              {profile?.currency || '$'}
              {monthlyExpensesTotal}/mo)
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('assets')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition"
            title="Assets Grounded"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span>
              <strong className="text-slate-900">{assets.length}</strong> Appliances
            </span>
          </button>

          <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Server-side Isolated</span>
          </div>
        </div>
      </div>

      {/* 2. Main Chat Layout with Sidebar & Main Conversation Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[640px]">
        {/* Left Sidebar: Conversation History */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-[640px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Conversations
              </span>
              <button
                id="btn-new-chat"
                onClick={handleNewConversation}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Conversation List */}
            <div className="space-y-1 overflow-y-auto max-h-[500px] pr-1">
              {isLoadingConvs ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
              ) : conversations.length === 0 ? (
                <div className="py-8 text-center px-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No saved conversations yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ask a question below to start analyzing your household.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition ${
                        isActive
                          ? 'bg-indigo-50/80 border border-indigo-200/60 text-indigo-950 font-medium'
                          : 'hover:bg-slate-50 border border-transparent text-slate-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs truncate font-medium">{conv.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Isolation: UID Secured</span>
            <button
              onClick={handleNewConversation}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Right Area: Chat Message Thread & Input Box */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col h-[640px] overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-50/40">
            {messages.length === 0 ? (
              <div className="py-6 px-2 space-y-6">
                <div className="text-center max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    How can HouseMind help your home today?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Ask anything about your household finances, appliance maintenance schedules,
                    energy optimization, or replacement budgeting.
                  </p>
                </div>

                {/* Starter Prompts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {STARTER_PROMPTS.map((group, idx) => {
                    const Icon = group.icon;
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-2 mb-2.5">
                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                              <Icon className="w-4 h-4" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800">{group.category}</h4>
                          </div>
                          <div className="space-y-1.5">
                            {group.prompts.map((p, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => handleSendMessage(p)}
                                className="w-full text-left text-[11.5px] text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 p-1.5 rounded-lg transition line-clamp-2 leading-tight border border-transparent hover:border-indigo-100"
                              >
                                "{p}"
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                        isUser
                          ? 'bg-slate-900 text-white'
                          : 'bg-indigo-600 text-white shadow-indigo-200'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-2xs ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="space-y-2 prose prose-slate prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-table:my-2">
                            <div className="markdown-body text-slate-800 text-sm">
                              <Markdown>{msg.content}</Markdown>
                            </div>

                            {/* Copy button */}
                            <div className="flex items-center justify-end pt-2 border-t border-slate-100 mt-2">
                              <button
                                onClick={() => handleCopyText(msg.content, index)}
                                className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-700 transition"
                              >
                                {copiedIndex === index ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy response</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggested Follow-up Questions for Assistant Messages */}
                      {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                        <div className="space-y-1.5 pt-1 pl-1">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            Suggested Follow-ups
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.suggestedQuestions.map((sq, sqIdx) => (
                              <button
                                key={sqIdx}
                                onClick={() => handleSendMessage(sq)}
                                disabled={isLoading}
                                className="inline-flex items-center text-xs bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 px-3 py-1.5 rounded-full transition shadow-2xs font-medium"
                              >
                                <span>{sq}</span>
                                <ChevronRight className="w-3 h-3 ml-1 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Thinking / Loading Animation */}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    />
                    <span className="text-xs text-slate-500 font-medium ml-2">
                      Reasoning with household data...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {chatError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Generation Error: </strong>
                  {chatError}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Input Area */}
          <div className="p-3.5 bg-white border-t border-slate-200">
            <div className="relative flex items-end bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white focus-within:border-indigo-500 transition">
              <textarea
                ref={inputRef}
                id="copilot-input"
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask HouseMind Copilot about bills, maintenance, appliances, or savings..."
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden max-h-32"
              />
              <button
                id="btn-send-message"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className={`p-2 rounded-lg font-medium transition ${
                  inputText.trim() && !isLoading
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>Gemini 3.7 • Grounded to your data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Chat Deletion */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingConv)}
        title="Delete Conversation"
        itemName={deletingConv?.title || 'Conversation'}
        itemType="conversation"
        description="Are you sure you want to permanently delete this chat history?"
        warningNote="This conversation will be permanently removed from your household history."
        confirmLabel="Delete Conversation"
        isDeleting={isDeletingConv}
        onConfirm={handleConfirmDeleteConversation}
        onCancel={() => setDeletingConv(null)}
      />
    </div>
  );
};
