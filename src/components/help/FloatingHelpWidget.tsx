import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ArrowUpRight,
  Search,
  BookOpen,
  ChevronRight,
  Bot,
  Maximize2,
} from 'lucide-react';
import { NavigationTab } from '../Navbar';
import { api } from '../../lib/api';
import { ChatMessage } from '../../types';
import { HELP_ARTICLES } from './helpData';
import { CopilotChatContainer } from '../copilot/CopilotChatContainer';

interface FloatingHelpWidgetProps {
  onNavigate: (tab: NavigationTab) => void;
  activeTab?: NavigationTab;
}

export function FloatingHelpWidget({ onNavigate, activeTab }: FloatingHelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'copilot' | 'help'>('copilot');

  // Copilot State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingCopilot, setIsLoadingCopilot] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // Help Search State
  const [helpQuery, setHelpQuery] = useState('');

  // Global Escape Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (queryText: string) => {
    const query = queryText.trim();
    if (!query || isLoadingCopilot) return;

    setChatError(null);
    setLastFailedQuery(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingCopilot(true);

    try {
      const response = await api.sendCopilotChat({
        message: query,
        conversationId: conversationId || undefined,
      });

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        suggestedQuestions: response.suggestedQuestions,
        actionProposal: response.actionProposal,
        actionExecution: response.actionExecution,
        morningBrief: response.morningBrief,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (!conversationId && response.conversationId) {
        setConversationId(response.conversationId);
      }
    } catch (err: any) {
      console.error('Floating Copilot error:', err);
      const errMsg = err.message || 'I am temporarily having trouble reaching the household intelligence engine.';
      setChatError(errMsg);
      setLastFailedQuery(query);
    } finally {
      setIsLoadingCopilot(false);
    }
  };

  const handleApproveAction = async (msgIndex: number, actionId: string) => {
    try {
      setExecutingActionId(actionId);
      const executionResult = await api.approveAgentAction(actionId);

      setMessages((prev) => {
        const next = [...prev];
        const msg = { ...next[msgIndex] };
        if (msg.actionProposal) {
          msg.actionProposal = {
            ...msg.actionProposal,
            status: executionResult.success ? 'executed' : 'failed',
          };
        }
        msg.actionExecution = executionResult;
        next[msgIndex] = msg;
        return next;
      });

      if (executionResult.actionType === 'navigateTab' && executionResult.postState?.tab) {
        setIsOpen(false);
        onNavigate(executionResult.postState.tab as NavigationTab);
      }
    } catch (err: any) {
      console.error('Failed to approve action in floating widget:', err);
      setChatError(err.message || 'Failed to execute approved action.');
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleCancelAction = async (msgIndex: number, actionId: string) => {
    try {
      await api.cancelAgentAction(actionId);
      setMessages((prev) => {
        const next = [...prev];
        const msg = { ...next[msgIndex] };
        if (msg.actionProposal) {
          msg.actionProposal = {
            ...msg.actionProposal,
            status: 'cancelled',
          };
        }
        next[msgIndex] = msg;
        return next;
      });
    } catch (err: any) {
      console.error('Failed to cancel action in floating widget:', err);
      setChatError(err.message || 'Failed to cancel action proposal.');
    }
  };

  // Filtered Help Articles
  const filteredArticles = HELP_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(helpQuery.toLowerCase()) ||
      a.shortDescription.toLowerCase().includes(helpQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(helpQuery.toLowerCase())
  ).slice(0, 5);

  return (
    <>
      {/* 1. Floating Action Launcher Button (Always visible at bottom-right) */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen && (
          <button
            id="floating-help-widget-btn"
            onClick={() => setIsOpen(true)}
            className="group inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-slate-900 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-102 transition-all cursor-pointer border border-indigo-400/30 active:scale-98"
            title="Ask HouseMind Copilot & Quick Help"
          >
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-xs font-bold tracking-tight">Ask Copilot & Help</span>
          </button>
        )}
      </div>

      {/* 2. Floating Expandable Panel */}
      {isOpen && (
        <div
          id="floating-help-panel"
          className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[410px] h-[540px] max-h-[85vh] bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          {/* Panel Top Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">HouseMind Assistant</h3>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Grounded Intelligence
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate(activeMode === 'copilot' ? 'copilot' : 'help');
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                id="floating-help-close-btn"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Close Assistant (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <button
              onClick={() => setActiveMode('copilot')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMode === 'copilot'
                  ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Copilot</span>
            </button>
            <button
              onClick={() => setActiveMode('help')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMode === 'help'
                  ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Quick Help & FAQs</span>
            </button>
          </div>

          {/* Panel Body: COPILOT MODE */}
          {activeMode === 'copilot' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/50">
              <CopilotChatContainer
                messages={messages}
                isLoading={isLoadingCopilot}
                chatError={chatError}
                lastFailedQuery={lastFailedQuery}
                onSendMessage={handleSendMessage}
                onApproveAction={handleApproveAction}
                onCancelAction={handleCancelAction}
                onNavigateTab={(tab) => {
                  setIsOpen(false);
                  onNavigate(tab as NavigationTab);
                }}
                isCompact={true}
                executingActionId={executingActionId}
                placeholder="Ask a question about your home..."
                className="h-full"
              />
            </div>
          )}

          {/* Panel Body: HELP & FAQ MODE */}
          {activeMode === 'help' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/50">
              <div className="p-3 border-b border-slate-200 bg-white">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={helpQuery}
                    onChange={(e) => setHelpQuery(e.target.value)}
                    placeholder="Search guides, debt math, OCR..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => {
                      setIsOpen(false);
                      if (article.actionLink?.targetTab) {
                        onNavigate(article.actionLink.targetTab);
                      } else {
                        onNavigate('help');
                      }
                    }}
                    className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition cursor-pointer shadow-2xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {article.title}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {article.shortDescription}
                    </p>
                  </div>
                ))}

                {filteredArticles.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching articles found for "{helpQuery}".
                  </div>
                )}
              </div>

              {/* Bottom Quick Action: Open Full Help Center */}
              <div className="p-3 bg-white border-t border-slate-200 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('help');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                >
                  <span>Open Full Help Center & Docs</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
