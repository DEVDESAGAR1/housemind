import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Home,
  Wrench,
  ShieldCheck,
  Zap,
  Wallet,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { GlobalSearchResultItem, GlobalSearchResponse, GlobalSearchCategory } from '../types';
import { NavigationTab } from './Navbar';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab, targetId?: string, targetSubTab?: string) => void;
}

export function SearchModal({ isOpen, onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<GlobalSearchResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSearchResponse(null);
      setError(null);
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Perform search with debounce
  const executeSearch = useCallback(async (q: string, category: string) => {
    if (!q.trim()) {
      setSearchResponse(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await api.searchHousehold(q, category, 50);
      setSearchResponse(res);
      setSelectedIndex(0);
    } catch (err: any) {
      console.error('Search request failed:', err);
      setError(err.message || 'Failed to search household records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setSearchResponse(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val, selectedCategory);
    }, 200);
  };

  const handleCategoryChange = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    if (query.trim()) {
      executeSearch(query, categoryKey);
    }
  };

  const handleSelectResult = (item: GlobalSearchResultItem) => {
    onClose();
    onNavigate(item.targetTab as NavigationTab, item.targetId, item.targetSubTab);
  };

  // Keyboard navigation within results
  const currentResults = searchResponse?.results || [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % currentResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + currentResults.length) % currentResults.length);
      }
    } else if (e.key === 'Enter') {
      if (currentResults[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(currentResults[selectedIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeElement = resultsContainerRef.current.querySelector(
        `[data-result-index="${selectedIndex}"]`
      ) as HTMLElement | null;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const quickSearchSuggestions = [
    'HVAC',
    'Refrigerator',
    'Electricity',
    'Mortgage',
    'Warranty',
    'Plumbing',
    'Insurance',
    'Invoice',
  ];

  const getEntityIcon = (type: string, category: string) => {
    switch (category) {
      case 'properties':
        return type === 'room' ? <Layers className="w-4 h-4 text-amber-600" /> : <Home className="w-4 h-4 text-amber-600" />;
      case 'assets':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'maintenance':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'warranties':
        return <Award className="w-4 h-4 text-indigo-600" />;
      case 'utilities':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'finances':
        return type === 'credit_card' ? (
          <CreditCard className="w-4 h-4 text-rose-500" />
        ) : type === 'loan' ? (
          <Building2 className="w-4 h-4 text-indigo-500" />
        ) : (
          <Wallet className="w-4 h-4 text-emerald-600" />
        );
      case 'documents':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'properties':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'assets':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'maintenance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warranties':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'utilities':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'finances':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'documents':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-20 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white">
          <Search className={`w-5 h-5 transition-colors ${isLoading ? 'text-indigo-600 animate-pulse' : 'text-slate-400'}`} />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search properties, assets, maintenance, bills, loans, documents..."
            className="flex-1 bg-transparent text-base sm:text-lg text-slate-900 placeholder:text-slate-400 outline-hidden font-medium"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSearchResponse(null);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 cursor-pointer"
            title="Close (Esc)"
          >
            ESC
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-slate-50/80 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {(searchResponse?.categories || [
            { key: 'all', label: 'All', count: 0 },
            { key: 'properties', label: 'Properties & Rooms', count: 0 },
            { key: 'assets', label: 'Assets & Equipment', count: 0 },
            { key: 'maintenance', label: 'Maintenance', count: 0 },
            { key: 'warranties', label: 'Warranties', count: 0 },
            { key: 'utilities', label: 'Utilities & Bills', count: 0 },
            { key: 'finances', label: 'Finances & Debts', count: 0 },
            { key: 'documents', label: 'Documents', count: 0 },
          ]).map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 bg-white hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                {query.trim() && cat.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[60vh]"
        >
          {/* 1. Initial State: No query yet */}
          {!query.trim() && !isLoading && (
            <div className="py-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Search across your entire household
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Type any property name, appliance, maintenance task, warranty, utility provider, loan, or uploaded document to jump directly to it.
                </p>
              </div>

              {/* Quick Search Suggestions */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Suggested Searches
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickSearchSuggestions.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setQuery(item);
                        executeSearch(item, selectedCategory);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Searchable Domains Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Home className="w-3.5 h-3.5 text-amber-600" />
                    <span>Homes & Rooms</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Deeds, properties, zoned rooms</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    <span>Assets & Systems</span>
                  </div>
                  <p className="text-[11px] text-slate-500">HVAC, appliances, serials</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Maintenance</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Service tasks, warranties</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Utilities</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Electric, water, gas, internet</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Wallet className="w-3.5 h-3.5 text-purple-600" />
                    <span>Finances</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Loans, mortgages, cards, expenses</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Documents</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Receipts, statements, manuals</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Loading State */}
          {isLoading && (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 animate-pulse flex items-center justify-between"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="h-6 w-16 bg-slate-200 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* 3. Error State */}
          {error && !isLoading && (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900">Search Error</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
              <button
                onClick={() => executeSearch(query, selectedCategory)}
                className="px-4 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition cursor-pointer"
              >
                Retry Search
              </button>
            </div>
          )}

          {/* 4. No Results Found */}
          {!isLoading && !error && query.trim() && currentResults.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                No results found for "{query}"
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try a different property name, asset, provider, document, bill, or maintenance task.
              </p>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => handleCategoryChange('all')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition cursor-pointer"
                >
                  Search in all categories
                </button>
              )}
            </div>
          )}

          {/* 5. Results List */}
          {!isLoading && !error && currentResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  Found {searchResponse?.totalMatches || currentResults.length} matching record
                  {(searchResponse?.totalMatches || currentResults.length) === 1 ? '' : 's'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">↑</kbd>{' '}
                  <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">↓</kbd> to navigate,{' '}
                  <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200">↵</kbd> to open
                </span>
              </div>

              <div className="space-y-1.5">
                {currentResults.map((item, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <div
                      key={item.id}
                      data-result-index={index}
                      onClick={() => handleSelectResult(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-200 shadow-xs'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`p-2 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition ${
                            isSelected
                              ? 'bg-white border-indigo-200 shadow-xs'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {getEntityIcon(item.entityType, item.category)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isSelected ? 'text-indigo-950 font-bold' : 'text-slate-900'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold border ${getCategoryBadgeClass(
                                item.category
                              )}`}
                            >
                              {item.badge}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold transition ${
                            isSelected
                              ? 'text-indigo-600 opacity-100'
                              : 'text-slate-400 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <strong className="font-semibold text-slate-700">Search</strong> • Instant discovery across all household systems
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Protected by private household isolation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
