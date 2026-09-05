import React, { useState, useRef, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Sun,
  CheckCircle2,
  XCircle,
  Lock,
  Compass,
  DollarSign,
  Home,
  RotateCcw,
  ChevronRight,
  Database,
  Wrench,
  Receipt,
  Landmark,
  FileText,
  Calendar,
  Zap,
} from 'lucide-react';
import { ChatMessage } from '../../types';

export interface CopilotChatContainerProps {
  messages: ChatMessage[];
  isLoading: boolean;
  chatError: string | null;
  lastFailedQuery: string | null;
  onSendMessage: (text: string) => Promise<void> | void;
  onApproveAction?: (msgIndex: number, actionId: string) => Promise<void> | void;
  onCancelAction?: (msgIndex: number, actionId: string) => Promise<void> | void;
  onNavigateTab: (tab: string) => void;
  isCompact?: boolean;
  executingActionId?: string | null;
  placeholder?: string;
  className?: string;
}

export interface ExtractedSourceChip {
  type: string;
  label: string;
  targetTab: string;
  subTab?: string;
  icon: string;
}

/**
 * Extracts grounded source citations and entity mentions from assistant replies
 */
function extractSourceCitations(text: string): ExtractedSourceChip[] {
  if (!text) return [];
  const chips: ExtractedSourceChip[] = [];
  const seen = new Set<string>();

  const patterns: Array<{ regex: RegExp; type: string; targetTab: string; subTab?: string; icon: string }> = [
    { regex: /\[(?:Asset|Appliance|Equipment):\s*([^\]]+)\]/gi, type: 'asset', targetTab: 'assets', icon: '🔧' },
    { regex: /\[(?:Warranty|Protection):\s*([^\]]+)\]/gi, type: 'warranty', targetTab: 'maintenance', subTab: 'warranties', icon: '🛡️' },
    { regex: /\[(?:Issue|Ticket):\s*([^\]]+)\]/gi, type: 'issue', targetTab: 'maintenance', subTab: 'issues', icon: '⚠️' },
    { regex: /\[(?:Maintenance|Task):\s*([^\]]+)\]/gi, type: 'maintenance', targetTab: 'maintenance', subTab: 'maintenance', icon: '🛠️' },
    { regex: /\[(?:Bill|Expense):\s*([^\]]+)\]/gi, type: 'expense', targetTab: 'expenses', icon: '💳' },
    { regex: /\[(?:Loan|Mortgage):\s*([^\]]+)\]/gi, type: 'loan', targetTab: 'utilities', subTab: 'loans', icon: '🏦' },
    { regex: /\[(?:Utility|Power|Water|Gas):\s*([^\]]+)\]/gi, type: 'utility', targetTab: 'utilities', subTab: 'utilities', icon: '⚡' },
    { regex: /\[(?:Document|Receipt|Invoice):\s*([^\]]+)\]/gi, type: 'document', targetTab: 'documents', icon: '📄' },
  ];

  for (const p of patterns) {
    let match: RegExpExecArray | null;
    while ((match = p.regex.exec(text)) !== null) {
      const label = match[1].trim();
      const key = `${p.type}:${label}`;
      if (!seen.has(key) && label.length > 1) {
        seen.add(key);
        chips.push({
          type: p.type,
          label,
          targetTab: p.targetTab,
          subTab: p.subTab,
          icon: p.icon,
        });
      }
    }
  }

  // Also check for prominent Indian entities if mentioned explicitly
  if (text.includes('Daikin') && !seen.has('asset:Daikin AC')) {
    chips.push({ type: 'asset', label: 'Daikin 1.5T Split AC', targetTab: 'assets', icon: '❄️' });
    seen.add('asset:Daikin AC');
  }
  if (text.includes('Kent') && !seen.has('asset:Kent RO')) {
    chips.push({ type: 'asset', label: 'Kent RO Purifier', targetTab: 'assets', icon: '💧' });
    seen.add('asset:Kent RO');
  }
  if (text.includes('HDFC') && !seen.has('loan:HDFC Home Loan')) {
    chips.push({ type: 'loan', label: 'HDFC Home Loan', targetTab: 'utilities', icon: '🏦' });
    seen.add('loan:HDFC Home Loan');
  }

  return chips.slice(0, 4);
}

export const STARTER_PROMPTS = [
  {
    category: 'Understand',
    icon: Compass,
    color: 'indigo',
    prompts: [
      'How is my household doing?',
      'What needs my attention?',
    ],
  },
  {
    category: 'Money',
    icon: DollarSign,
    color: 'emerald',
    prompts: [
      'What bills are due this week?',
      'How much am I spending each month?',
    ],
  },
  {
    category: 'Home',
    icon: Home,
    color: 'amber',
    prompts: [
      'Any overdue maintenance?',
      'Which warranties expire soon?',
    ],
  },
  {
    category: 'Agent',
    icon: Sun,
    color: 'violet',
    prompts: [
      'Give me my morning brief.',
      'What should I do first?',
    ],
  },
];

export const COMPACT_STARTER_CHIPS = [
  'What bills are due this week?',
  'Explain my Household Health Score',
  'Any overdue maintenance tasks?',
  'Give me my morning brief',
];

export const CopilotChatContainer: React.FC<CopilotChatContainerProps> = ({
  messages,
  isLoading,
  chatError,
  lastFailedQuery,
  onSendMessage,
  onApproveAction,
  onCancelAction,
  onNavigateTab,
  isCompact = false,
  executingActionId = null,
  placeholder = 'Ask HouseMind Copilot about bills, maintenance, appliances, or savings...',
  className = '',
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;
    setInputText('');
    onSendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden bg-white ${className}`}>
      {/* Scrollable Messages Area */}
      <div className={`flex-1 overflow-y-auto space-y-4 ${isCompact ? 'p-3.5 text-xs bg-slate-50/60' : 'p-5 space-y-5 bg-slate-50/40'}`}>
        {messages.length === 0 ? (
          <div className={`${isCompact ? 'py-4 px-1 space-y-3' : 'py-6 px-2 space-y-6'}`}>
            {isCompact ? (
              /* Compact mode clean starting conversation */
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3 shadow-2xs space-y-2">
                    <p className="text-slate-800 leading-relaxed font-medium">
                      👋 <strong>Hello! I am your HouseMind Copilot.</strong>
                    </p>
                    <p className="text-slate-600 leading-relaxed text-[11.5px]">
                      Ask me anything about your household equipment, bills, loan payments, or maintenance schedule.
                    </p>
                  </div>
                </div>

                {/* Compact Starter Suggestion Chips */}
                <div className="pl-9 space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Quick Suggestions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPACT_STARTER_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(chip)}
                        disabled={isLoading}
                        className="text-[11px] text-left px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 font-medium transition cursor-pointer"
                      >
                        💡 {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Full page view with 4-category starter prompts grid */
              <div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
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
                                onClick={() => handleSend(p)}
                                className="w-full text-left text-[11.5px] text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 p-1.5 rounded-lg transition line-clamp-2 leading-tight border border-transparent hover:border-indigo-100 cursor-pointer"
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
            )}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`rounded-full flex items-center justify-center shrink-0 font-bold shadow-2xs ${
                    isCompact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
                  } ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-indigo-600 text-white shadow-indigo-200'
                  }`}
                >
                  {isUser ? <User className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} /> : <Sparkles className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} />}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-[88%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl leading-relaxed shadow-2xs ${
                      isCompact ? 'px-3.5 py-2.5 text-xs' : 'px-4 py-3 text-sm'
                    } ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-2 prose prose-slate prose-sm max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1">
                        <div className="markdown-body text-slate-800">
                          <Markdown>{msg.content}</Markdown>
                        </div>

                        {/* Morning Brief Card Widget */}
                        {msg.morningBrief && (
                          <div className="mt-3 not-prose p-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-slate-50 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-lg bg-amber-100 text-amber-800">
                                  <Sun className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">Household Morning Brief</h4>
                                  <p className="text-[10px] text-slate-500">Autonomous Daily Household Diagnostic</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Priority Briefing
                              </span>
                            </div>

                            {/* Metric Highlights */}
                            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                              <div className="bg-white/80 p-1.5 rounded-lg border border-slate-200/60">
                                <span className="text-[9.5px] text-slate-400 font-medium block">Monthly Burn</span>
                                <span className="font-bold text-slate-800 text-xs">
                                  {msg.morningBrief.groundedFacts?.currency || '$'} {(msg.morningBrief.groundedFacts?.totalMonthlyBurnRate ?? msg.morningBrief.financialObligationsSummary?.monthlyBurnRate ?? 0).toFixed(0)}/mo
                                </span>
                              </div>
                              <div className="bg-white/80 p-1.5 rounded-lg border border-slate-200/60">
                                <span className="text-[9.5px] text-slate-400 font-medium block">Total Debt</span>
                                <span className="font-bold text-slate-800 text-xs">
                                  {msg.morningBrief.groundedFacts?.currency || '$'} {(msg.morningBrief.groundedFacts?.totalOutstandingDebt ?? 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-white/80 p-1.5 rounded-lg border border-slate-200/60">
                                <span className="text-[9.5px] text-slate-400 font-medium block">Health Score</span>
                                <span className="font-bold text-slate-800 text-xs">
                                  {msg.morningBrief.isProvisional ? 'Unrated' : `${msg.morningBrief.healthScore ?? '--'}/100`}
                                </span>
                              </div>
                            </div>

                            {/* Priority Attention Buckets */}
                            {msg.morningBrief.itemsNeedingAttention && msg.morningBrief.itemsNeedingAttention.length > 0 ? (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                  Items Needing Attention ({msg.morningBrief.itemsNeedingAttention.length})
                                </span>
                                <div className="space-y-1 max-h-36 overflow-y-auto">
                                  {msg.morningBrief.itemsNeedingAttention.map((item, iIdx) => {
                                    const isCrit = item.urgency === 'critical';
                                    const isOverdue = item.urgency === 'overdue';
                                    const isToday = item.urgency === 'due_today';
                                    return (
                                      <div
                                        key={iIdx}
                                        className={`p-1.5 rounded-lg text-[11px] flex items-center justify-between border ${
                                          isCrit
                                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                                            : isOverdue
                                            ? 'bg-red-50 border-red-200 text-red-900'
                                            : isToday
                                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                                            : 'bg-blue-50 border-blue-200 text-blue-900'
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0 pr-1.5">
                                          <div className="flex items-center gap-1">
                                            <span className={`text-[8.5px] font-extrabold uppercase px-1 py-0.2 rounded ${
                                              isCrit ? 'bg-rose-200 text-rose-900' : isOverdue ? 'bg-red-200 text-red-900' : 'bg-slate-200 text-slate-800'
                                            }`}>
                                              {item.urgency.replace('_', ' ')}
                                            </span>
                                            <span className="font-semibold truncate">{item.title}</span>
                                          </div>
                                        </div>
                                        {item.actionTab && (
                                          <button
                                            onClick={() => onNavigateTab(item.actionTab!)}
                                            className="shrink-0 px-1.5 py-0.5 bg-white/90 hover:bg-white text-slate-800 rounded border border-slate-200/80 font-medium text-[10px] transition cursor-pointer"
                                          >
                                            View
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] text-center font-medium">
                                ✓ No immediate critical or overdue items today.
                              </div>
                            )}

                            {/* Recommended First Action */}
                            {msg.morningBrief.recommendedFirstAction && (
                              <div className="p-2 rounded-lg bg-indigo-50/80 border border-indigo-200 flex items-center justify-between gap-1.5 text-xs">
                                <div className="min-w-0">
                                  <span className="text-[9.5px] font-bold text-indigo-700 uppercase tracking-wider block">Recommended Action</span>
                                  <p className="text-slate-800 font-medium text-[11px] truncate">{msg.morningBrief.recommendedFirstAction.actionLabel}</p>
                                </div>
                                {msg.morningBrief.recommendedFirstAction.actionTab && (
                                  <button
                                    onClick={() => onNavigateTab(msg.morningBrief!.recommendedFirstAction!.actionTab)}
                                    className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10.5px] font-semibold transition cursor-pointer"
                                  >
                                    <span>Open</span>
                                    <ChevronRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Approval Card */}
                        {msg.actionProposal && (
                          <div className="mt-3 not-prose p-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <div className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900">{msg.actionProposal.title}</h4>
                                  <p className="text-[9.5px] text-slate-500">Autonomous Action Proposal • Safe Allowlist</p>
                                </div>
                              </div>
                              <span className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border ${
                                msg.actionProposal.status === 'executed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : msg.actionProposal.status === 'cancelled'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : msg.actionProposal.status === 'failed' || msg.actionProposal.status === 'denied'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {msg.actionProposal.status === 'pending_approval' ? 'Requires Approval' : msg.actionProposal.status.toUpperCase()}
                              </span>
                            </div>

                            <div className="bg-white/90 rounded-lg p-2 border border-slate-200/70 text-[11px] space-y-1 text-slate-700">
                              <p className="font-medium text-slate-800">{msg.actionProposal.description}</p>
                              <div className="flex items-center gap-1 text-[10.5px] text-slate-500">
                                <span className="font-semibold text-slate-600">Expected:</span>
                                <span>{msg.actionProposal.expectedOutcome}</span>
                              </div>
                            </div>

                            {/* Verification Result */}
                            {msg.actionExecution ? (
                              <div className={`p-2 rounded-lg border text-[11px] ${
                                msg.actionExecution.success
                                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                                  : 'bg-rose-50/90 border-rose-200 text-rose-950'
                              }`}>
                                <div className="flex items-center gap-1 font-semibold mb-0.5">
                                  {msg.actionExecution.success ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  )}
                                  <span>{msg.actionExecution.message}</span>
                                </div>
                                {msg.actionExecution.verification && (
                                  <div className="text-[10px] text-slate-600 flex items-center justify-between pt-0.5 border-t border-slate-200/60 mt-0.5">
                                    <span>State Verification: {msg.actionExecution.verification.checkedCondition}</span>
                                    <span className="text-emerald-700 font-bold ml-1">✓ Confirmed</span>
                                  </div>
                                )}
                              </div>
                            ) : msg.actionProposal.status === 'pending_approval' ? (
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => onApproveAction && onApproveAction(index, msg.actionProposal!.actionId)}
                                    disabled={executingActionId === msg.actionProposal.actionId}
                                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                                  >
                                    {executingActionId === msg.actionProposal.actionId ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Executing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Approve & Execute</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => onCancelAction && onCancelAction(index, msg.actionProposal!.actionId)}
                                    disabled={executingActionId === msg.actionProposal.actionId}
                                    className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <p className="text-[9.5px] text-slate-400 text-center flex items-center justify-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  Requires explicit human permission.
                                </p>
                              </div>
                            ) : msg.actionProposal.status === 'cancelled' ? (
                              <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] text-center">
                                Action was cancelled. No household changes made.
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Extracted Grounded Sources & Entity Badges */}
                        {(() => {
                          const sources = extractSourceCitations(msg.content);
                          if (sources.length === 0) return null;
                          return (
                            <div className="not-prose pt-2.5 border-t border-slate-100 mt-2.5 space-y-1.5">
                              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Database className="w-2.5 h-2.5 text-indigo-500" />
                                Grounded Household Records
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {sources.map((src, sIdx) => (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => onNavigateTab(src.targetTab)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-[11px] font-medium border border-indigo-200/60 transition cursor-pointer shadow-2xs"
                                  >
                                    <span>{src.icon}</span>
                                    <span>{src.label}</span>
                                    <ChevronRight className="w-2.5 h-2.5 text-indigo-400" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Copy button & Timestamp */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1.5 text-[10.5px] text-slate-400">
                          <span>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          <button
                            onClick={() => handleCopyText(msg.content, index)}
                            className="inline-flex items-center space-x-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamp for User message */}
                  {isUser && msg.timestamp && (
                    <span className="text-[9.5px] text-slate-400 block text-right pr-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}

                  {/* Suggested Follow-up Questions */}
                  {!isUser && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                    <div className="space-y-1 pt-1 pl-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="w-2.5 h-2.5" />
                        Suggested Follow-ups
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {msg.suggestedQuestions.map((sq, sqIdx) => (
                          <button
                            key={sqIdx}
                            onClick={() => handleSend(sq)}
                            disabled={isLoading}
                            className="inline-flex items-center text-[11px] bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 px-2.5 py-1 rounded-full transition shadow-2xs font-medium cursor-pointer"
                          >
                            <span>{sq}</span>
                            <ChevronRight className="w-2.5 h-2.5 ml-0.5 text-slate-400" />
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

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className={`rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs ${isCompact ? 'w-6 h-6' : 'w-8 h-8'}`}>
              <Sparkles className={`animate-spin ${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
                <span className="text-[11px] text-slate-500 font-medium ml-1.5">
                  Reasoning with household data...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message with Retry */}
        {chatError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center justify-between gap-2">
            <div>
              <strong className="font-semibold">Generation Error: </strong>
              {chatError}
            </div>
            {lastFailedQuery && (
              <button
                onClick={() => handleSend(lastFailedQuery)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-[11px] transition shrink-0 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Input Area */}
      <div className={`bg-white border-t border-slate-200 ${isCompact ? 'p-2.5' : 'p-3.5'}`}>
        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white focus-within:border-indigo-500 transition">
          {isCompact ? (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              id="floating-copilot-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
            />
          ) : (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              id="copilot-input"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden max-h-32"
            />
          )}
          <button
            type="button"
            id={isCompact ? 'floating-copilot-send-btn' : 'btn-send-message'}
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className={`p-2 rounded-lg font-medium transition cursor-pointer ${
              inputText.trim() && !isLoading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="Send query"
          >
            <Send className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        </div>
        {!isCompact && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Gemini • Grounded to your data</span>
          </div>
        )}
      </div>
    </div>
  );
};
