import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  FileText,
  Cookie,
  Server,
  Download,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Info,
  Layers,
} from 'lucide-react';

export type PolicyTab = 'privacy' | 'terms' | 'cookies' | 'security';

interface LegalPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyTab;
  onOpenProfilePrivacy?: () => void;
}

export function LegalPoliciesModal({
  isOpen,
  onClose,
  initialTab = 'privacy',
  onOpenProfilePrivacy,
}: LegalPoliciesModalProps) {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="HouseMind Trust, Privacy & Legal Policies"
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-indigo-950/40 text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Trust, Privacy & Governance
              </h2>
              <p className="text-xs text-slate-400">
                Transparent data practices and clear architectural boundaries for HouseMind.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'cookies'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Cookie & Storage Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Use</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Security Architecture</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm text-slate-300 leading-relaxed">
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-1">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Core Privacy Commitment</span>
                </div>
                <p className="text-xs text-indigo-200">
                  HouseMind is designed with zero-trust multitenancy. Your household documents, financials, and equipment logs are isolated to your authenticated account and are never used to train external foundation models.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">1. Categories of Data Handled</h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                  <li><strong>Account Credentials:</strong> Handled securely via Firebase Authentication (email, OAuth token, and UID).</li>
                  <li><strong>Household Profile & Geometry:</strong> Residence name, property specifications, floor layouts, and rooms.</li>
                  <li><strong>Equipment & Physical Assets:</strong> Brand names, model numbers, serial tags, purchase dates, and warranties.</li>
                  <li><strong>Operational Maintenance & Issues:</strong> Scheduled service logs, diagnostic checklists, and issue resolutions.</li>
                  <li><strong>Household Finances:</strong> Recurring utility billing intervals, loan amortizations, and credit card commitments.</li>
                  <li><strong>Uploaded Records:</strong> Tax invoices, warranty cards, and appliance manuals stored in your private document vault.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">2. AI Processing Boundaries</h3>
                <p className="text-xs text-slate-300">
                  HouseMind combines deterministic math with Google Gemini server-side processing for text summarization, OCR entity extraction, and contextual chat. API keys remain protected in Google Cloud Secret Manager. User prompts and document payloads are never retained for model training.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">3. Data Portability & Deletion</h3>
                <p className="text-xs text-slate-300">
                  You maintain 100% ownership of your household archive. You can export complete JSON archives or CSV ledgers at any time, or permanently erase your data via the Privacy Center in your Profile settings.
                </p>
              </div>

              {onOpenProfilePrivacy && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenProfilePrivacy();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition cursor-pointer"
                  >
                    <span>Open Household Data & Privacy Controls</span>
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COOKIES & STORAGE POLICY */}
          {activeTab === 'cookies' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-1">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cookie className="w-3.5 h-3.5" />
                  <span>Zero 3rd-Party Ad Tracking</span>
                </div>
                <p className="text-xs text-amber-200">
                  HouseMind does not utilize cross-site advertising cookies, behavioral trackers, or data-broker SDKs. Browser storage is used strictly for core app functionality and anonymous telemetry.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">Browser Storage Inventory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      localStorage
                    </div>
                    <p className="text-slate-400">
                      Stores client UI preferences, completed Guided Tour IDs (<code className="text-indigo-300">housemind_completed_tours</code>), active demo toggle, and cached filters. Zero sensitive financial or PII data is stored.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Firebase Auth Token
                    </div>
                    <p className="text-slate-400">
                      Maintains your authenticated session securely using standard cryptographic JWT tokens via Firebase SDK.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 md:col-span-2">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                      Privacy-Safe Analytics (Free Tier GA4)
                    </div>
                    <p className="text-slate-400">
                      Collects high-level category interactions (e.g. tab clicks, tour completion). Strict parameter sanitization scrubs all filenames, dollar amounts, PII, and LLM text before dispatch.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TERMS OF USE */}
          {activeTab === 'terms' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">1. Scope of Service</h3>
                <p className="text-xs text-slate-300">
                  HouseMind is a household operating system and personal decision-support tool. It assists in organizing appliance records, tracking maintenance schedules, and visualizing household commitments.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">2. User Sovereignty & Professional Disclaimer</h3>
                <p className="text-xs text-slate-300">
                  AI-assisted recommendations, diagnostic checklists, and scenario forecasts are advisory in nature. HouseMind does not provide certified structural engineering, licensed electrical inspection, or professional tax advice. Always consult certified technicians for dangerous high-voltage electrical, plumbing, or structural repairs.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">3. Acceptable Use</h3>
                <p className="text-xs text-slate-300">
                  You agree to use HouseMind strictly for lawful personal household management and not to reverse-engineer, overload, or disrupt backend infrastructure or attempt unauthorized multi-tenant access.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY ARCHITECTURE */}
          {activeTab === 'security' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white">Defense-in-Depth Architecture</h3>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Dual-Layer Multi-Tenant Security:</strong> Cryptographic server-side JWT verification paired with isolated per-user data structures guarantees complete cross-household data isolation.
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Secret Manager Integration:</strong> All Gemini API keys and server credentials are dynamically injected via Google Cloud Secret Manager on Cloud Run. Zero credentials ever reach client browsers.
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <Server className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Deterministic Guardrails:</strong> Authoritative health metrics, financial burn rates, and due dates are computed through mathematical engines that cannot be altered or corrupted by AI hallucination.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>HouseMind Governance • Production Security Standard</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
