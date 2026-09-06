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
  const [popoverSize, setPopoverSize] = useState<{ width: number; height: number }>({ width: 390, height: 260 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset step index on tour change
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [tour?.id]);

  const step: TourStep | undefined = tour?.steps[currentStepIndex];

  // Helper to query element by priority order if comma-separated
  const findTargetElement = useCallback((selectorStr?: string): HTMLElement | null => {
    if (!selectorStr) return null;
    const parts = selectorStr.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      try {
        const found = document.querySelector<HTMLElement>(part);
        if (found) return found;
      } catch {
        // continue
      }
    }
    return null;
  }, []);

  // Measure target element rect without triggering scrolling
  const measureTargetRect = useCallback(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    try {
      const el = findTargetElement(step.targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } catch {
      setTargetRect(null);
    }
  }, [step?.targetSelector, findTargetElement]);

  // Handle step transitions: navigate tab, scroll target into view once if needed, then measure
  useEffect(() => {
    if (!step) return;

    if (step.tab && onNavigateTab) {
      onNavigateTab(step.tab, step.subTab);
    }

    // Single one-shot scroll into view after tab view renders
    const scrollTimer = setTimeout(() => {
      if (step.targetSelector) {
        try {
          const el = findTargetElement(step.targetSelector);
          if (el) {
            const rect = el.getBoundingClientRect();
            const preferred = step.placement || 'bottom';
            const popoverH = 270;

            const needsScroll =
              rect.top < 80 ||
              (preferred === 'bottom' && rect.bottom + popoverH + 24 > window.innerHeight) ||
              (preferred === 'top' && rect.top - popoverH - 24 < 64) ||
              rect.bottom > window.innerHeight;

            if (needsScroll) {
              if (preferred === 'bottom') {
                // Scroll element near top of screen (84px below navbar) to maximize room below
                const targetScrollY = window.scrollY + rect.top - 84;
                window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' });
              } else if (preferred === 'top') {
                // Scroll element towards bottom to maximize room above
                const targetScrollY = window.scrollY + rect.bottom - (window.innerHeight - 84);
                window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' });
              } else {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        } catch {
          // safe fallback
        }
      }
      measureTargetRect();
    }, 150);

    // Dynamic listeners to update rect during user scroll/resize (WITHOUT triggering scrollIntoView)
    const handleViewportChange = () => {
      measureTargetRect();
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setPopoverSize({ width: rect.width, height: rect.height });
        }
      }
    };

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('scroll', handleViewportChange, { passive: true, capture: true });

    return () => {
      clearTimeout(scrollTimer);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [step, onNavigateTab, measureTargetRect]);

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

  // Determine popup placement cleanly within viewport
  let popoverStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  if (targetRect) {
    const margin = 16;
    const popoverWidth = Math.min(390, window.innerWidth - 32);
    const popoverHeight = Math.max(240, popoverSize.height);

    const fitsBelow = targetRect.bottom + popoverHeight + margin <= window.innerHeight;
    const fitsAbove = targetRect.top - popoverHeight - margin >= 64; // 64px navbar clearance
    const fitsRight = targetRect.right + popoverWidth + margin <= window.innerWidth;
    const fitsLeft = targetRect.left - popoverWidth - margin >= 16;

    let top = 0;
    let left = Math.max(16, Math.min(targetRect.left, window.innerWidth - popoverWidth - 16));

    const preferred = step.placement || 'bottom';

    if (preferred === 'top' && fitsAbove) {
      top = targetRect.top - popoverHeight - margin;
    } else if ((preferred === 'bottom' || preferred === 'top') && fitsBelow) {
      top = targetRect.bottom + margin;
    } else if (fitsAbove) {
      top = targetRect.top - popoverHeight - margin;
    } else if (fitsRight) {
      left = targetRect.right + margin;
      top = Math.max(70, Math.min(targetRect.top, window.innerHeight - popoverHeight - 16));
    } else if (fitsLeft) {
      left = targetRect.left - popoverWidth - margin;
      top = Math.max(70, Math.min(targetRect.top, window.innerHeight - popoverHeight - 16));
    } else {
      // Pick side with maximum vertical clearance
      const spaceAbove = targetRect.top;
      const spaceBelow = window.innerHeight - targetRect.bottom;
      if (spaceAbove >= spaceBelow) {
        top = Math.max(70, targetRect.top - popoverHeight - margin);
      } else {
        top = Math.min(window.innerHeight - popoverHeight - 16, targetRect.bottom + margin);
      }
    }

    popoverStyle = {
      ...popoverStyle,
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${popoverWidth}px`,
    };
  } else {
    // Centered modal
    popoverStyle = {
      ...popoverStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(92vw, 420px)',
    };
  }

  // Calculate spotlight coordinates with padding
  const spotlightPad = 6;
  const spotX = targetRect ? Math.max(0, targetRect.left - spotlightPad) : 0;
  const spotY = targetRect ? Math.max(0, targetRect.top - spotlightPad) : 0;
  const spotW = targetRect ? targetRect.width + spotlightPad * 2 : 0;
  const spotH = targetRect ? targetRect.height + spotlightPad * 2 : 0;

  return (
    <div
      id="guided-tour-modal"
      className="fixed inset-0 z-[100] select-none pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Guided Tour: ${tour.title}`}
    >
      {/* SVG Cutout Backdrop Mask (Zero Layout Shift, Perfect Cutout) */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      >
        <defs>
          <mask id="guided-tour-mask">
            {/* White background fills the mask (visible) */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black rectangle punches out the spotlight hole */}
            {targetRect && (
              <rect
                x={spotX}
                y={spotY}
                width={spotW}
                height={spotH}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Dark tinted backdrop with mask hole */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.6)"
          mask="url(#guided-tour-mask)"
        />
      </svg>

      {/* Target Spotlight Highlight Ring Outline */}
      {targetRect && (
        <div
          id="guided-tour-spotlight"
          className="fixed border-2 border-indigo-400 bg-indigo-500/10 rounded-2xl ring-4 ring-indigo-500/20 pointer-events-none animate-pulse"
          style={{
            top: `${spotY}px`,
            left: `${spotX}px`,
            width: `${spotW}px`,
            height: `${spotH}px`,
            zIndex: 9998,
          }}
        />
      )}

      {/* Step Popover Card */}
      <div
        id="guided-tour-popover"
        ref={modalRef}
        style={popoverStyle}
        className="bg-slate-900/95 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-indigo-950/80 text-white backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
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
            id="guided-tour-btn-exit"
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
            id="guided-tour-btn-skip"
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-200 transition px-2 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center gap-1"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip Tour</span>
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                id="guided-tour-btn-prev"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            <button
              id="guided-tour-btn-next"
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

