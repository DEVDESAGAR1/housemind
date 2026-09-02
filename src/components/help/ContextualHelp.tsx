import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, ExternalLink, X, ArrowRight, Lightbulb } from 'lucide-react';
import { NavigationTab } from '../Navbar';

interface ContextualHelpProps {
  title: string;
  summary: string;
  bullets?: string[];
  tip?: string;
  targetArticleCategory?: string;
  onNavigateToHelp?: () => void;
  size?: 'sm' | 'md';
  variant?: 'subtle' | 'button' | 'badge';
  id?: string;
}

export function ContextualHelp({
  title,
  summary,
  bullets,
  tip,
  onNavigateToHelp,
  size = 'sm',
  variant = 'subtle',
  id,
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {variant === 'badge' ? (
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          title={`Help & info about ${title}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition cursor-pointer"
        >
          <HelpCircle className="w-3 h-3 text-indigo-600" />
          <span>Help</span>
        </button>
      ) : variant === 'button' ? (
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          title={`Help & info about ${title}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
          <span>Guide</span>
        </button>
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          title={`Help: ${title}`}
          className={`p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-lg transition cursor-pointer ${
            size === 'md' ? 'p-1.5' : 'p-1'
          }`}
        >
          <Info className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        </button>
      )}

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">{title}</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{summary}</p>

          {bullets && bullets.length > 0 && (
            <ul className="mt-2 space-y-1 pl-1">
              {bullets.map((b, idx) => (
                <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {tip && (
            <div className="mt-2.5 p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-tight">{tip}</span>
            </div>
          )}

          {onNavigateToHelp && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToHelp();
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
              >
                <span>Read Full Guide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
