import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  LayoutDashboard,
  ShieldCheck,
  UploadCloud,
  Wrench,
  Wallet,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { HOUSEMIND_TOURS, GuidedTour } from './tourDefinitions';

interface TourCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTour: (tourId: string) => void;
}

export function TourCatalogModal({
  isOpen,
  onClose,
  onSelectTour,
}: TourCatalogModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'overview' | 'core' | 'intelligence' | 'financial'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedTourIds, setCompletedTourIds] = useState<string[]>([]);

  // Load completed tours from storage
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = JSON.parse(localStorage.getItem('housemind_completed_tours') || '[]');
        setCompletedTourIds(Array.isArray(saved) ? saved : []);
      } catch {
        setCompletedTourIds([]);
      }
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allTours = useMemo(() => Object.values(HOUSEMIND_TOURS), []);

  const filteredTours = useMemo(() => {
    return allTours.filter((tour) => {
      const matchesCat = selectedCategory === 'all' || tour.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        tour.title.toLowerCase().includes(q) ||
        tour.shortDescription.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [allTours, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: GuidedTour['category']) => {
    switch (category) {
      case 'overview':
        return <Compass className="w-4 h-4 text-purple-600" />;
      case 'core':
        return <LayoutDashboard className="w-4 h-4 text-blue-600" />;
      case 'intelligence':
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
      case 'financial':
        return <Wallet className="w-4 h-4 text-emerald-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBadgeClass = (category: GuidedTour['category']) => {
    switch (category) {
      case 'overview':
        return 'bg-purple-50 text-purple-700 border-purple-200/60';
      case 'core':
        return 'bg-blue-50 text-blue-700 border-blue-200/60';
      case 'intelligence':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
      case 'financial':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200/60';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Guided Tours Catalog"
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Interactive Guided Tours
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Explore step-by-step walkthroughs explaining what each feature is, why it matters, and how to use it.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close guided tours dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: `All Tours (${allTours.length})` },
              { id: 'overview', label: 'Overview' },
              { id: 'core', label: 'Core Domains' },
              { id: 'intelligence', label: 'Intelligence' },
              { id: 'financial', label: 'Financial' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative shrink-0 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tours..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {/* Tour List Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto grow bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTours.map((tour) => {
              const isCompleted = completedTourIds.includes(tour.id);
              return (
                <div
                  key={tour.id}
                  className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(tour.category)}`}>
                        {getCategoryIcon(tour.category)}
                        <span>{tour.category}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Completed</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">
                          {tour.steps.length} {tour.steps.length === 1 ? 'step' : 'steps'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                      {tour.title}
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      {tour.shortDescription}
                    </p>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      Step-by-step spotlight tour
                    </span>

                    <button
                      onClick={() => {
                        onSelectTour(tour.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer group-hover:bg-indigo-600 group-hover:text-white"
                    >
                      <span>{isCompleted ? 'Restart Tour' : 'Start Tour'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTours.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              No guided tours found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
