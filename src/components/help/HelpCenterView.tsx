import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Sparkles,
  Building2,
  Home,
  Wrench,
  ShieldCheck,
  Zap,
  Wallet,
  FileText,
  SlidersHorizontal,
  Bell,
  Lock,
  Database,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Upload,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  X,
  MessageSquare,
  Layers,
  Info,
} from 'lucide-react';
import {
  HELP_CATEGORIES,
  HELP_ARTICLES,
  HelpArticle,
  HelpCategoryId,
  searchHelpArticles,
} from './helpData';
import { NavigationTab } from '../Navbar';

interface HelpCenterViewProps {
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenGlobalUpload?: () => void;
  onOpenProfile?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  onOpenNotificationPreferences?: () => void;
}

export function HelpCenterView({
  onNavigateTab,
  onOpenGlobalUpload,
  onOpenProfile,
  onOpenSearch,
  onOpenNotifications,
  onOpenNotificationPreferences,
}: HelpCenterViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategoryId | 'all'>('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string>(HELP_ARTICLES[0].id);
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

  // Filtered Articles based on search & category
  const filteredArticles = useMemo(() => {
    const category = selectedCategory === 'all' ? undefined : selectedCategory;
    return searchHelpArticles(searchQuery, category);
  }, [searchQuery, selectedCategory]);

  // Active Article
  const activeArticle = useMemo(() => {
    return (
      filteredArticles.find((a) => a.id === selectedArticleId) ||
      filteredArticles[0] ||
      HELP_ARTICLES[0]
    );
  }, [filteredArticles, selectedArticleId]);

  const handleActionClick = (action: HelpArticle['actionLink']) => {
    if (!action) return;

    if (action.targetTab) {
      onNavigateTab(action.targetTab);
    } else if (action.modalAction) {
      switch (action.modalAction) {
        case 'upload':
          if (onOpenGlobalUpload) onOpenGlobalUpload();
          break;
        case 'profile':
          if (onOpenProfile) onOpenProfile();
          break;
        case 'search':
          if (onOpenSearch) onOpenSearch();
          break;
        case 'notifications':
          if (onOpenNotifications) onOpenNotifications();
          break;
        case 'preferences':
          if (onOpenNotificationPreferences) onOpenNotificationPreferences();
          break;
      }
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" />;
      case 'Building2':
        return <Building2 className="w-4 h-4" />;
      case 'Home':
        return <Home className="w-4 h-4" />;
      case 'Wrench':
        return <Wrench className="w-4 h-4" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4" />;
      case 'Zap':
        return <Zap className="w-4 h-4" />;
      case 'Wallet':
        return <Wallet className="w-4 h-4" />;
      case 'FileText':
        return <FileText className="w-4 h-4" />;
      case 'SlidersHorizontal':
        return <SlidersHorizontal className="w-4 h-4" />;
      case 'Bell':
        return <Bell className="w-4 h-4" />;
      case 'Search':
        return <Search className="w-4 h-4" />;
      case 'Database':
        return <Database className="w-4 h-4" />;
      case 'Lock':
        return <Lock className="w-4 h-4" />;
      case 'Upload':
        return <Upload className="w-4 h-4" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Help Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/30">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-indigo-200 text-xs font-semibold border border-white/10">
            <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
            <span>HouseMind Knowledge & Operational Center</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            How can we assist your household today?
          </h1>

          <p className="text-sm text-indigo-200 leading-relaxed max-w-2xl">
            Search our comprehensive guides on physical property specs, maintenance schedules, debt tracking,
            AI document extraction, and zero-lock-in data governance.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help by topic, appliance, bill, schedule, or keyword..."
              className="w-full pl-12 pr-10 py-3.5 bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl text-sm font-medium shadow-lg focus:outline-hidden focus:ring-4 focus:ring-indigo-500/30 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Tags */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar text-xs">
            <span className="text-indigo-200/80 font-medium shrink-0">Popular:</span>
            {['Upload & Scan', 'Health Score', 'Ledger Export', 'Calendar', 'Lead Times', 'DELETE MY DATA'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(tag)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition whitespace-nowrap cursor-pointer text-[11px]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Getting Started Roadmap */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs transition">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsChecklistExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                New Household Onboarding Roadmap
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">
                  11 Steps
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick checklist for cataloging properties, major assets, finances, and notifications
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            <span>{isChecklistExpanded ? 'Hide Steps' : 'View Steps'}</span>
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                isChecklistExpanded ? 'rotate-90' : ''
              }`}
            />
          </button>
        </div>

        {isChecklistExpanded && (
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
            {[
              {
                step: '1',
                title: 'Set Residence & Currency',
                desc: 'Configure home address and currency.',
                tab: 'dashboard',
                modal: 'profile',
              },
              {
                step: '2',
                title: 'Add Properties & Rooms',
                desc: 'Map living spaces and utility rooms.',
                tab: 'properties',
              },
              {
                step: '3',
                title: 'Catalog Appliances & Assets',
                desc: 'Log HVAC, water heaters, and serials.',
                tab: 'assets',
              },
              {
                step: '4',
                title: 'Record Debts & Utilities',
                desc: 'Set electric, gas, mortgage & cards.',
                tab: 'utilities',
              },
              {
                step: '5',
                title: 'Upload Receipts & Docs',
                desc: 'Extract entities with Gemini Vision.',
                tab: 'documents',
                modal: 'upload',
              },
              {
                step: '6',
                title: 'Review Before Save',
                desc: 'Audit AI extracted values with 100% human oversight.',
                tab: 'documents',
              },
              {
                step: '7',
                title: 'Check Command Center',
                desc: 'Review 0–100 Household Health Score.',
                tab: 'dashboard',
              },
              {
                step: '8',
                title: 'Unified Calendar Schedule',
                desc: 'Track bills, maintenance & warranties.',
                tab: 'calendar',
              },
              {
                step: '9',
                title: 'Notification Lead Times',
                desc: 'Set advance notice windows.',
                tab: 'dashboard',
                modal: 'preferences',
              },
              {
                step: '10',
                title: 'Global Search (⌘K)',
                desc: 'Fast discovery across 13 domains.',
                modal: 'search',
              },
              {
                step: '11',
                title: 'Consult AI Copilot',
                desc: 'Ask tactical questions about your home.',
                tab: 'copilot',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 rounded-xl transition flex items-start gap-3 group"
              >
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </span>
                <div className="grow">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
                {item.tab && (
                  <button
                    type="button"
                    onClick={() => {
                      if (item.modal === 'profile' && onOpenProfile) onOpenProfile();
                      else if (item.modal === 'upload' && onOpenGlobalUpload) onOpenGlobalUpload();
                      else if (item.modal === 'preferences' && onOpenNotificationPreferences) onOpenNotificationPreferences();
                      else onNavigateTab(item.tab as NavigationTab);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                    title="Jump to feature"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {!item.tab && item.modal === 'search' && onOpenSearch && (
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                    title="Open Search"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Layout: Categories & Search Results vs Article Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Category Pills & Article List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Category Filter Horizontal Scroll / Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Help Domains ({HELP_CATEGORIES.length})
            </div>

            <div className="space-y-1 mt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Articles</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">
                  {HELP_ARTICLES.length}
                </span>
              </button>

              {HELP_CATEGORIES.map((cat) => {
                const count = HELP_ARTICLES.filter((a) => a.category === cat.id).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getCategoryIcon(cat.iconName)}
                      <span className="truncate">{cat.title}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Matching Articles List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Guides ({filteredArticles.length})
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Clear search
                </button>
              )}
            </div>

            {filteredArticles.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No matching articles found</p>
                <p className="text-[11px] text-slate-500">
                  Try searching with terms like "upload", "health", "calendar", "csv", or "delete".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredArticles.map((art) => {
                  const isActive = activeArticle?.id === art.id;
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => setSelectedArticleId(art.id)}
                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {art.title}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] line-clamp-2 mt-1 leading-relaxed ${
                          isActive ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        {art.shortDescription}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                            isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-200/70 text-slate-600'
                          }`}
                        >
                          {art.readTime}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Article Detailed Reading Pane (8 cols) */}
        <div className="lg:col-span-8">
          {activeArticle ? (
            <article className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              {/* Article Header */}
              <div className="border-b border-slate-100 pb-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold rounded-lg uppercase tracking-wider">
                    {HELP_CATEGORIES.find((c) => c.id === activeArticle.category)?.title || activeArticle.category}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">{activeArticle.readTime}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {activeArticle.title}
                </h2>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {activeArticle.shortDescription}
                </p>

                {activeArticle.actionLink && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick(activeArticle.actionLink)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <span>{activeArticle.actionLink.label}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Article Content Sections */}
              <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
                {activeArticle.contentSections.map((sec, idx) => (
                  <section key={idx} className="space-y-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block"></span>
                      {sec.heading}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">{sec.body}</p>

                    {sec.points && sec.points.length > 0 && (
                      <ul className="space-y-2 pl-2">
                        {sec.points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {sec.callout && (
                      <div
                        className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
                          sec.callout.type === 'tip'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : sec.callout.type === 'warning'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                            : sec.callout.type === 'success'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                        }`}
                      >
                        {sec.callout.type === 'tip' && <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                        {sec.callout.type === 'warning' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                        {sec.callout.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                        {sec.callout.type === 'info' && <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
                        <span className="leading-relaxed font-medium">{sec.callout.text}</span>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {/* Bottom Helpful Prompt & Copilot Link */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/60 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Have a unique scenario?</h4>
                    <p className="text-[11px] text-slate-500">
                      Ask AI Copilot to analyze your household records directly.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('copilot')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Copilot</span>
                </button>
              </div>
            </article>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Select a help guide to begin reading</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore articles on property structure, financial tracking, document extraction, or system security.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
