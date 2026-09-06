import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Building,
  CreditCard,
  Wrench,
  RefreshCw,
  MessageSquare,
  Activity,
  Clock,
  Check,
  Lock,
  X,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  HouseholdProfile,
  HouseholdExpense,
  HomeAsset,
  ChatMessage,
  ConversationSummary,
  AgentActivityItem,
} from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { CopilotChatContainer } from './copilot/CopilotChatContainer';
import { trackEvent } from '../lib/analytics';
import { CopilotActionInput } from '../utils/copilotActionResolver';

export interface CopilotViewProps {
  profile: HouseholdProfile | null;
  expenses: HouseholdExpense[];
  assets: HomeAsset[];
  onNavigateTab: (tab: string, subTab?: string, entityId?: string) => void;
  initialPrompt?: string;
  initialDomain?: string;
  onRefreshNotifications?: () => void;
  onRefreshHouseholdData?: () => void;
  onExecuteAction?: (action: CopilotActionInput) => void;
}

export const CopilotView: React.FC<CopilotViewProps> = ({
  profile,
  expenses,
  assets,
  onNavigateTab,
  initialPrompt,
  initialDomain,
  onRefreshNotifications,
  onRefreshHouseholdData,
  onExecuteAction,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('housemind_active_copilot_conv_id') || null;
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState<ConversationSummary | null>(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{ status: 'available' | 'unavailable' | 'not_configured' } | null>(null);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  // Agent Activity Timeline State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityTimeline, setActivityTimeline] = useState<AgentActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const executedInitialPromptRef = useRef<string | null>(null);

  // Load conversation list and AI availability status on mount & track open
  useEffect(() => {
    trackEvent('copilot_opened');
    loadConversations();
    api.getAiStatus()
      .then((res) => setAiStatus({ status: res.status }))
      .catch(() => setAiStatus({ status: 'unavailable' }));
  }, []);

  // Handle initial contextual prompt if provided
  useEffect(() => {
    if (initialPrompt && initialPrompt !== executedInitialPromptRef.current) {
      executedInitialPromptRef.current = initialPrompt;
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (!isMobileHistoryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileHistoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileHistoryOpen]);

  const loadConversations = async () => {
    try {
      setIsLoadingConvs(true);
      const list = await api.getCopilotConversations();
      setConversations(list);
      if (activeConversationId) {
        const found = list.find((c) => c.id === activeConversationId);
        if (found) {
          api.getCopilotConversation(found.id).then((detail) => {
            if (detail?.messages) setMessages(detail.messages);
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('Failed to load copilot conversations:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  };

  const loadActivityTimeline = async () => {
    try {
      setIsLoadingActivity(true);
      const res = await api.getAgentActivity({ limit: 50 });
      setActivityTimeline(res.activities || []);
    } catch (err) {
      console.error('Failed to load agent activity:', err);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Switch or load a specific conversation
  const handleSelectConversation = async (convId: string) => {
    if (convId === activeConversationId && messages.length > 0) return;
    try {
      setIsLoading(true);
      setChatError(null);
      setLastFailedQuery(null);
      setActiveConversationId(convId);
      try {
        localStorage.setItem('housemind_active_copilot_conv_id', convId);
      } catch {}
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
    try {
      localStorage.removeItem('housemind_active_copilot_conv_id');
    } catch {}
    setMessages([]);
    setChatError(null);
    setLastFailedQuery(null);
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

  // Send message to Gemini / Agent Orchestrator
  const handleSendMessage = async (queryText: string) => {
    const query = queryText.trim();
    if (!query || isLoading) return;

    setChatError(null);
    setLastFailedQuery(null);

    const userMsgId = 'user-' + Date.now();
    const userTimestamp = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: userTimestamp,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    trackEvent('copilot_question_submitted');

    try {
      const response = await api.sendCopilotChat({
        message: query,
        conversationId: activeConversationId || undefined,
      });

      trackEvent('copilot_response_success', {
        response_mode: response.actionProposal ? 'ai' : 'deterministic',
      });

      const assistantMessage: ChatMessage = {
        id: 'resp-' + Date.now(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        suggestedQuestions: response.suggestedQuestions,
        actionProposal: response.actionProposal,
        actionExecution: response.actionExecution,
        morningBrief: response.morningBrief,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!activeConversationId && response.conversationId) {
        setActiveConversationId(response.conversationId);
        try {
          localStorage.setItem('housemind_active_copilot_conv_id', response.conversationId);
        } catch {}
      }

      // Refresh conversations list to update titles/ordering
      loadConversations();
    } catch (err: any) {
      console.error('Copilot chat error:', err);
      trackEvent('copilot_response_fallback', { result: 'failure' });
      const errMsg = err.message || 'Failed to receive reply from HouseMind Copilot.';
      setChatError(errMsg);
      setLastFailedQuery(query);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAction = async (msgIndex: number, actionId: string) => {
    try {
      setExecutingActionId(actionId);
      trackEvent('copilot_action_clicked', { action_type: 'action_execution' });
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

      // Truthful post-action updates: refresh household state and trigger navigation if requested
      if (executionResult.success) {
        if (executionResult.actionType === 'navigateTab' && executionResult.postState?.tab) {
          if (onExecuteAction) {
            onExecuteAction({
              actionType: 'navigate',
              tab: executionResult.postState.tab,
              subTab: executionResult.postState.subTab,
              entityId: executionResult.postState.entityId,
            });
          } else {
            onNavigateTab(executionResult.postState.tab, executionResult.postState.subTab, executionResult.postState.entityId);
          }
        } else if (executionResult.actionType === 'markNotificationRead' || executionResult.actionType === 'markAllNotificationsRead') {
          onRefreshNotifications?.();
        } else {
          // Entity mutations: tasks, issues, expenses, etc.
          onRefreshHouseholdData?.();
          onRefreshNotifications?.();
        }
      }
    } catch (err: any) {
      console.error('Failed to approve action:', err);
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
      console.error('Failed to cancel action:', err);
      setChatError(err.message || 'Failed to cancel action proposal.');
    }
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

  const handleNavigateFromCopilot = (tab: string, subTab?: string, entityIdentifier?: string) => {
    if (onExecuteAction) {
      onExecuteAction({
        actionType: 'view',
        tab,
        subTab,
        entityId: entityIdentifier,
      });
      return;
    }
    let resolvedEntityId = entityIdentifier;
    if (entityIdentifier) {
      const lower = entityIdentifier.toLowerCase();
      if (tab === 'assets') {
        const match = assets.find(
          (a) => a.id === entityIdentifier || a.name.toLowerCase().includes(lower) || (a.brand && lower.includes(a.brand.toLowerCase()))
        );
        if (match) resolvedEntityId = match.id;
      } else if (tab === 'expenses') {
        const match = expenses.find(
          (e) => e.id === entityIdentifier || e.title.toLowerCase().includes(lower)
        );
        if (match) resolvedEntityId = match.id;
      }
    }
    onNavigateTab(tab, subTab, resolvedEntityId);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Header & Grounding Context Bar */}
      <div
        id="copilot-page-header"
        data-tour="copilot-assistant"
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </span>
            <span>HouseMind Copilot</span>
            {aiStatus?.status === 'available' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI Active
              </span>
            ) : aiStatus?.status === 'not_configured' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                AI Not Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                AI Unavailable
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Autonomous, grounded intelligence for your home appliances, maintenance, bills, and warranty protection.
          </p>
        </div>

        {/* Live Grounding Summary Badges & Activity Trigger */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition cursor-pointer"
            title="Current Home Profile"
          >
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-900 truncate max-w-[130px]">
              {profile?.homeName || 'Maplewood'}
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('expenses')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition cursor-pointer"
            title="Expenses Grounded"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              <strong className="text-slate-900">{expenses.length}</strong> Bills (
              {profile?.currency || '$'}
              {monthlyExpensesTotal}/mo)
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('assets')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition cursor-pointer"
            title="Assets Grounded"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span>
              <strong className="text-slate-900">{assets.length}</strong> Appliances
            </span>
          </button>

          <button
            id="btn-open-agent-activity"
            data-tour="agent-activity"
            onClick={() => {
              setShowActivityModal(true);
              loadActivityTimeline();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl font-semibold transition cursor-pointer shadow-2xs"
            title="View Autonomous Agent Activity & Audit Trail"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Agent Activity</span>
          </button>
        </div>
      </div>

      {/* 2. Main Chat Layout with Left Conversation Sidebar & Unified Chat Container */}
      {/* Mobile History Control Bar */}
      <div className="flex lg:hidden items-center justify-between gap-2 p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <button
          id="btn-mobile-conversations"
          type="button"
          onClick={() => setIsMobileHistoryOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
          <span>Conversations ({conversations.length})</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-mobile-new-chat"
            type="button"
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
          <button
            type="button"
            onClick={handleNewConversation}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
            title="Reset active chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 min-h-[580px] h-[calc(100vh-14rem)] max-h-[860px]">
        {/* Left Sidebar: Conversation History (Desktop) */}
        <div className="hidden lg:flex lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex-col justify-between h-full overflow-hidden">
          <div className="flex flex-col h-[calc(100%-48px)]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Conversations
              </span>
              <button
                id="btn-new-chat"
                onClick={handleNewConversation}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-lg transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Conversation List */}
            <div className="space-y-1 overflow-y-auto flex-1 pr-1">
              {isLoadingConvs ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>
              ) : conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 px-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-600">No conversations yet</p>
                  <p className="text-[11px] mt-1 text-slate-400">Ask a question to start exploring your home data.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition border ${
                        isActive
                          ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950 font-medium shadow-2xs'
                          : 'hover:bg-slate-50 border-transparent text-slate-700'
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Tenant Grounded</span>
            </span>
            <button
              onClick={handleNewConversation}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Right Main Chat Thread: Using Unified CopilotChatContainer */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden h-full flex flex-col">
          <CopilotChatContainer
            messages={messages}
            isLoading={isLoading}
            chatError={chatError}
            lastFailedQuery={lastFailedQuery}
            onSendMessage={handleSendMessage}
            onApproveAction={handleApproveAction}
            onCancelAction={handleCancelAction}
            onNavigateTab={handleNavigateFromCopilot}
            onExecuteAction={onExecuteAction}
            isCompact={false}
            executingActionId={executingActionId}
            placeholder="Ask HouseMind Copilot about bills, maintenance, appliances, or savings..."
            className="h-full"
          />
        </div>
      </div>

      {/* Agent Activity Timeline Drawer / Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shadow-2xs">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Agent Activity Timeline</h3>
                  <p className="text-xs text-slate-500">Autonomous investigations, approval requests & verified state executions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadActivityTimeline}
                  disabled={isLoadingActivity}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Refresh Timeline"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingActivity ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-white flex items-center gap-1.5 text-xs overflow-x-auto">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'ACTION_PROPOSED', label: 'Proposals' },
                { id: 'ACTION_EXECUTED', label: 'Executions' },
                { id: 'VERIFICATION_PASSED', label: 'Verifications' },
                { id: 'INVESTIGATED', label: 'Investigations' },
                { id: 'ACTION_DENIED', label: 'Security Denials' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActivityFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer shrink-0 ${
                    activityFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Timeline List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
              {isLoadingActivity ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>Loading agent activity history...</span>
                </div>
              ) : activityTimeline.filter((item) => activityFilter === 'all' || item.eventType === activityFilter).length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Activity className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">No agent activity logged yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Agent activities such as morning brief investigations, action proposals, approvals, and verified state changes will appear here in chronological order.
                  </p>
                </div>
              ) : (
                activityTimeline
                  .filter((item) => activityFilter === 'all' || item.eventType === activityFilter)
                  .map((item) => {
                    const isExec = item.eventType === 'ACTION_EXECUTED';
                    const isVerify = item.eventType === 'VERIFICATION_PASSED';
                    const isDenied = item.eventType === 'ACTION_DENIED';
                    const isCancelled = item.eventType === 'ACTION_CANCELLED';

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded-md text-xs ${
                              isVerify
                                ? 'bg-emerald-100 text-emerald-700'
                                : isDenied
                                ? 'bg-rose-100 text-rose-700'
                                : isCancelled
                                ? 'bg-slate-100 text-slate-700'
                                : isExec
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isVerify ? <Check className="w-3.5 h-3.5" /> : isDenied ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 pl-6">{item.description}</p>

                        <div className="flex items-center gap-2 pl-6 pt-1 text-[10px] text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {item.eventType}
                          </span>
                          {item.targetDomain && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                              Domain: {item.targetDomain}
                            </span>
                          )}
                          {item.verification?.verified && (
                            <span className="text-emerald-600 font-semibold ml-auto flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> State Verified
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-right">
              <button
                onClick={() => setShowActivityModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile History Drawer Modal */}
      {isMobileHistoryOpen && (
        <div
          id="mobile-history-drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileHistoryOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Household Conversations</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-mobile-new-chat"
                  onClick={() => {
                    handleNewConversation();
                    setIsMobileHistoryOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Chat</span>
                </button>
                <button
                  type="button"
                  id="btn-close-mobile-history"
                  onClick={() => setIsMobileHistoryOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-1.5 overflow-y-auto max-h-[60vh]">
              {conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <p className="font-semibold text-slate-600">No conversations yet</p>
                  <p className="text-[11px] mt-1 text-slate-400">Ask a question to start exploring your home data.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        handleSelectConversation(conv.id);
                        setIsMobileHistoryOpen(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition border ${
                        isActive
                          ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950 font-medium'
                          : 'hover:bg-slate-50 border-slate-100 text-slate-700'
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
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, conv)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
        </div>
      )}

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
