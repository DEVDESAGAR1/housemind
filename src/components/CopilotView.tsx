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

export interface CopilotViewProps {
  profile: HouseholdProfile | null;
  expenses: HouseholdExpense[];
  assets: HomeAsset[];
  onNavigateTab: (tab: string) => void;
  initialPrompt?: string;
  initialDomain?: string;
}

export const CopilotView: React.FC<CopilotViewProps> = ({
  profile,
  expenses,
  assets,
  onNavigateTab,
  initialPrompt,
  initialDomain,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState<ConversationSummary | null>(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // Agent Activity Timeline State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityTimeline, setActivityTimeline] = useState<AgentActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const executedInitialPromptRef = useRef<string | null>(null);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Handle initial contextual prompt if provided
  useEffect(() => {
    if (initialPrompt && initialPrompt !== executedInitialPromptRef.current) {
      executedInitialPromptRef.current = initialPrompt;
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

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
    if (convId === activeConversationId) return;
    try {
      setIsLoading(true);
      setChatError(null);
      setLastFailedQuery(null);
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
        actionProposal: response.actionProposal,
        actionExecution: response.actionExecution,
        morningBrief: response.morningBrief,
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
      setLastFailedQuery(query);
    } finally {
      setIsLoading(false);
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

      // If navigation action and target tab is specified, trigger navigation
      if (executionResult.actionType === 'navigateTab' && executionResult.postState?.tab) {
        onNavigateTab(executionResult.postState.tab);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header & Grounding Context Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                HouseMind Copilot
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Gemini Intelligence
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Grounded on your verified household database, appliances, and recurring bills.
              </p>
            </div>
          </div>
        </div>

        {/* Live Grounding Summary Badges & Activity Trigger */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => onNavigateTab('dashboard')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
            title="Current Home Profile"
          >
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-medium truncate max-w-[120px]">
              {profile?.homeName || 'Maplewood'}
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('expenses')}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
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
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
            title="Assets Grounded"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span>
              <strong className="text-slate-900">{assets.length}</strong> Appliances
            </span>
          </button>

          <button
            id="btn-open-agent-activity"
            onClick={() => {
              setShowActivityModal(true);
              loadActivityTimeline();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-lg font-medium transition cursor-pointer shadow-2xs"
            title="View Autonomous Agent Activity & Audit Trail"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Agent Activity</span>
          </button>
        </div>
      </div>

      {/* 2. Main Chat Layout with Left Conversation Sidebar & Unified Chat Container */}
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
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
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
                <div className="py-8 text-center text-xs text-slate-400">
                  <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <p>No chat history yet.</p>
                  <p className="text-[10px] mt-1 text-slate-400">Start asking questions below!</p>
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
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
            <span>Isolation: Tenant Grounded</span>
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
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden h-[640px]">
          <CopilotChatContainer
            messages={messages}
            isLoading={isLoading}
            chatError={chatError}
            lastFailedQuery={lastFailedQuery}
            onSendMessage={handleSendMessage}
            onApproveAction={handleApproveAction}
            onCancelAction={handleCancelAction}
            onNavigateTab={onNavigateTab}
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
