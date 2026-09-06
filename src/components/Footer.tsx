import React from 'react';
import {
  ShieldCheck,
  Compass,
  BookOpen,
  Lock,
  FileText,
  Cookie,
  User,
  LogOut,
  Sparkles,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import { NavigationTab } from './Navbar';
import { PolicyTab } from './legal/LegalPoliciesModal';

interface FooterProps {
  isAuthenticated?: boolean;
  onNavigateTab?: (tab: NavigationTab) => void;
  onOpenTour?: (tourId?: string) => void;
  onOpenHelpCenter?: () => void;
  onOpenHelpFloating?: () => void;
  onOpenPolicy?: (tab: PolicyTab) => void;
  onOpenProfile?: () => void;
  onSignOut?: () => void;
  onSignIn?: () => void;
}

export function Footer({
  isAuthenticated = false,
  onNavigateTab,
  onOpenTour,
  onOpenHelpCenter,
  onOpenHelpFloating,
  onOpenPolicy,
  onOpenProfile,
  onSignOut,
  onSignIn,
}: FooterProps) {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800/60">
        {/* Column 1: Product Navigation */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Product</span>
          </div>
          <ul className="space-y-2 text-xs">
            {isAuthenticated && onNavigateTab ? (
              <>
                <li>
                  <button
                    onClick={() => onNavigateTab('dashboard')}
                    className="hover:text-indigo-300 transition cursor-pointer text-left"
                  >
                    Command Center
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateTab('assets')}
                    className="hover:text-indigo-300 transition cursor-pointer text-left"
                  >
                    Properties & Assets
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateTab('maintenance')}
                    className="hover:text-indigo-300 transition cursor-pointer text-left"
                  >
                    Maintenance & Issues
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateTab('expenses')}
                    className="hover:text-indigo-300 transition cursor-pointer text-left"
                  >
                    Finances & Commitments
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateTab('documents')}
                    className="hover:text-indigo-300 transition cursor-pointer text-left"
                  >
                    Upload & Scan Vault
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateTab('copilot')}
                    className="hover:text-indigo-300 transition cursor-pointer text-left"
                  >
                    Household Copilot
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="text-slate-400">Command Center</li>
                <li className="text-slate-400">Household Intelligence</li>
                <li className="text-slate-400">Asset & Maintenance Management</li>
                <li className="text-slate-400">Documents & Upload</li>
                <li className="text-slate-400">Financial Intelligence</li>
              </>
            )}
          </ul>
        </div>

        {/* Column 2: Resources & Tours */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Resources</span>
          </div>
          <ul className="space-y-2 text-xs">
            {isAuthenticated ? (
              <>
                {onOpenTour && (
                  <li>
                    <button
                      onClick={() => onOpenTour('overview')}
                      className="hover:text-purple-300 transition cursor-pointer text-left flex items-center gap-1"
                    >
                      <Compass className="w-3 h-3 text-purple-400" />
                      <span>Guided Tours</span>
                    </button>
                  </li>
                )}
                {onOpenHelpCenter && (
                  <li>
                    <button
                      onClick={onOpenHelpCenter}
                      className="hover:text-purple-300 transition cursor-pointer text-left"
                    >
                      Help Center & FAQs
                    </button>
                  </li>
                )}
                {onOpenHelpFloating && (
                  <li>
                    <button
                      onClick={onOpenHelpFloating}
                      className="hover:text-purple-300 transition cursor-pointer text-left"
                    >
                      Ask Help & Support
                    </button>
                  </li>
                )}
                {onOpenTour && (
                  <li>
                    <button
                      onClick={() => onOpenTour('health')}
                      className="hover:text-purple-300 transition cursor-pointer text-left"
                    >
                      Health Diagnostics Guide
                    </button>
                  </li>
                )}
              </>
            ) : (
              <li>
                <a
                  href="https://sagardev.hashnode.dev/from-a-lost-warranty-to-housemind-building-an-ai-powered-household-operating-system"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-300 transition cursor-pointer text-left flex items-center gap-1 text-slate-400"
                >
                  <BookOpen className="w-3 h-3 text-purple-400" />
                  <span>Story of HouseMind</span>
                </a>
              </li>
            )}
          </ul>
        </div>

        {/* Column 3: Trust & Privacy */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trust & Privacy</span>
          </div>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => onOpenPolicy?.('privacy')}
                className="hover:text-emerald-300 transition cursor-pointer text-left flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Privacy Policy</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenPolicy?.('cookies')}
                className="hover:text-emerald-300 transition cursor-pointer text-left flex items-center gap-1"
              >
                <Cookie className="w-3 h-3 text-emerald-400" />
                <span>Cookie & Storage Policy</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenPolicy?.('terms')}
                className="hover:text-emerald-300 transition cursor-pointer text-left flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-emerald-400" />
                <span>Terms of Use</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenPolicy?.('security')}
                className="hover:text-emerald-300 transition cursor-pointer text-left flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Security Architecture</span>
              </button>
            </li>
            {isAuthenticated && onOpenProfile && (
              <li>
                <button
                  onClick={onOpenProfile}
                  className="hover:text-emerald-300 transition cursor-pointer text-left"
                >
                  Data Export & Deletion
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* Column 4: Account & Auth */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Account</span>
          </div>
          <ul className="space-y-2 text-xs">
            {isAuthenticated ? (
              <>
                {onOpenProfile && (
                  <li>
                    <button
                      onClick={onOpenProfile}
                      className="hover:text-amber-300 transition cursor-pointer text-left"
                    >
                      Profile & Regional Settings
                    </button>
                  </li>
                )}
                {onSignOut && (
                  <li>
                    <button
                      onClick={onSignOut}
                      className="hover:text-red-300 transition cursor-pointer text-left flex items-center gap-1 text-slate-400"
                    >
                      <LogOut className="w-3 h-3 text-red-400" />
                      <span>Sign Out</span>
                    </button>
                  </li>
                )}
              </>
            ) : (
              <>
                {onSignIn && (
                  <li>
                    <button
                      onClick={onSignIn}
                      className="hover:text-indigo-300 transition cursor-pointer text-left text-indigo-400 font-semibold"
                    >
                      Sign In with Google
                    </button>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom Legal Copyright & Security Badge */}
      <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>HouseMind — Privacy-First Household Operating System</span>
        </div>
        <div>
          HouseMind &copy; {new Date().getFullYear()} • Built for Cloud Run AI Challenge
        </div>
      </div>
    </footer>
  );
}
