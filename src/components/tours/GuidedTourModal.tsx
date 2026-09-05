import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Compass,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  SkipForward,
} from 'lucide-react';
import { GuidedTour, TourStep } from './tourDefinitions';
import { NavigationTab } from '../Navbar';

interface GuidedTourModalProps {
  tour: GuidedTour | null;
  onClose: () => void;
  onNavigateTab?: (tab: NavigationTab, subTab?: string) => void;
  onComplete?: (tourId: string) => void;
}

export function GuidedTourModal({
  tour,
  onClose,
  onNavigateTab,
  onComplete,
}: GuidedTourModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset step index on tour change
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [tour?.id]);

  const step: TourStep | undefined = tour?.steps[currentStepIndex];

  // Update target element positioning
  const updateTargetPosition = useCallback(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    try {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        // Scroll target into view gently if outside viewport
        if (
          rect.top < 0 ||
          rect.bottom > window.innerHeight ||
          rect.left < 0 ||
          rect.right > window.innerWidth
        ) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        setTargetRect(null);
      }
    } catch {
      setTargetRect(null);
    }
  }, [step]);

  // Sync tab navigation and recalculate target rect on step change
  useEffect(() => {
    if (!step) return;

    if (step.tab && onNavigateTab) {
      onNavigateTab(step.tab, step.subTab);
    }

    // Allow time for view rendering/tab transition before measuring DOM target
    const timer = setTimeout(updateTargetPosition, 180);
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [step, onNavigateTab, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!tour) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tour, currentStepIndex]);

  if (!tour || !step) return null;

  const totalSteps = tour.steps.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleNext = () => {
    if (isLastStep) {
      // Save completion state safely
      try {
        const saved = JSON.parse(localStorage.getItem('housemind_completed_tours') || '[]');
        if (!saved.includes(tour.id)) {
          saved.push(tour.id);
          localStorage.setItem('housemind_completed_tours', JSON.stringify(saved));
        }
      } catch {
        // Safe fallback
      }
      onComplete?.(tour.id);
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // Determine popup placement
  let popoverStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  if (targetRect) {
    const margin = 14;
    const popoverWidth = Math.min(380, window.innerWidth - 32);

    let top = targetRect.bottom + margin;
    let left = Math.max(16, Math.min(targetRect.left, window.innerWidth - popoverWidth - 16));

    // If bottom is out of bounds, place above
    if (top + 240 > window.innerHeight && targetRect.top > 250) {
      top = Math.max(16, targetRect.top - 240 - margin);
    }

    popoverStyle = {
      ...popoverStyle,
      top: `${Math.max(16, top)}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
    };
  } else {
    // Centered modal
    popoverStyle = {
      ...popoverStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(90vw, 420px)',
    };
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Guided Tour: ${tour.title}`}
    >
      {/* Darkened Backdrop Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Target Spotlight Highlight Ring if targetRect exists */}
      {targetRect && (
        <div
          className="absolute border-2 border-indigo-400 bg-indigo-500/15 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.7)] pointer-events-none transition-all duration-300 animate-pulse"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            zIndex: 9998,
          }}
        />
      )}

      {/* Step Popover Card */}
      <div
        ref={modalRef}
        style={popoverStyle}
        className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-indigo-950/80 text-white backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                {tour.title}
              </span>
              <div className="text-xs text-slate-400">
                Step <span className="font-semibold text-white">{currentStepIndex + 1}</span> of{' '}
                <span className="font-semibold text-white">{totalSteps}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Exit tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="py-4 space-y-2">
          <h4 className="text-base font-bold text-white leading-snug flex items-center gap-2">
            <span>{step.title}</span>
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-200 transition px-2 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center gap-1"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip Tour</span>
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
