import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  LayoutDashboard,
  Calendar,
  Home,
  Wrench,
  ShieldCheck,
  Zap,
  Wallet,
  FileText,
  SlidersHorizontal,
  Sparkles,
  User as UserIcon,
  LogOut,
  Settings,
  ReceiptText,
  Upload,
  Search,
  HelpCircle,
  ChevronDown,
  Menu,
  X,
  Bell,
  Database,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { HouseholdProfile } from '../types';
import { NotificationBell } from './notifications/NotificationBell';

export type NavigationTab =
  | 'dashboard'
  | 'calendar'
  | 'properties'
  | 'assets'
  | 'maintenance'
  | 'utilities'
  | 'finances'
  | 'expenses'
  | 'documents'
  | 'simulator'
  | 'copilot'
  | 'help';

interface NavbarProps {
  user: User;
  profile: HouseholdProfile | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenProfile: () => void;
  onSeedDemo: () => void;
  onSignOut: () => void;
  isSeeding: boolean;
  onOpenGlobalUpload?: () => void;
  onOpenSearch?: () => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenNotificationPreferences?: () => void;
}

export function Navbar({
  user,
  profile,
  activeTab,
  setActiveTab,
  onOpenProfile,
  onSeedDemo,
  onSignOut,
  isSeeding,
  onOpenGlobalUpload,
  onOpenSearch,
  unreadNotificationCount,
  onOpenNotifications,
  onOpenNotificationPreferences,
}: NavbarProps) {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const homeDisplayName = profile?.homeName || 'My Household';

  // Check if active tab is in the secondary "Tools" group
  const isToolActive = activeTab === 'simulator' || activeTab === 'expenses' || activeTab === 'help';

  // Handle outside clicks for dropdowns
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsToolsOpen(false);
        setIsProfileMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleTabSelect = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsToolsOpen(false);
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleTabSelect('dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
              title="Return to Command Center"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-slate-900 tracking-tight text-base block group-hover:text-indigo-600 transition-colors">
                  HouseMind
                </span>
                <span className="block text-[11px] text-slate-500 font-medium truncate max-w-[130px] lg:max-w-[160px]">
                  {homeDisplayName}
                </span>
              </div>
            </button>
          </div>

          {/* Middle: Desktop Primary Navigation (Large Viewports >= 1200px) */}
          <nav className="hidden xl:flex items-center gap-1">
            <button
              id="nav-dashboard-tab"
              onClick={() => handleTabSelect('dashboard')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>

            <button
              id="nav-calendar-tab"
              onClick={() => handleTabSelect('calendar')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calendar</span>
            </button>

            <button
              id="nav-properties-tab"
              onClick={() => handleTabSelect('properties')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'properties'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-amber-600" />
              <span>Properties</span>
            </button>

            <button
              id="nav-assets-tab"
              onClick={() => handleTabSelect('assets')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'assets'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>Assets</span>
            </button>

            <button
              id="nav-maintenance-tab"
              onClick={() => handleTabSelect('maintenance')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'maintenance'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Maintenance</span>
            </button>

            <button
              id="nav-utilities-tab"
              onClick={() => handleTabSelect('utilities')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'utilities'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Utilities</span>
            </button>

            <button
              id="nav-finances-tab"
              onClick={() => handleTabSelect('finances')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'finances'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Finances</span>
            </button>

            <button
              id="nav-documents-tab"
              onClick={() => handleTabSelect('documents')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Documents</span>
            </button>

            {/* Secondary Tools / More Dropdown */}
            <div className="relative" ref={toolsDropdownRef}>
              <button
                id="nav-tools-menu-btn"
                type="button"
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                aria-expanded={isToolsOpen}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isToolActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>Tools & More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isToolsOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Advanced Modules
                  </div>

                  <button
                    id="tool-simulator-btn"
                    type="button"
                    onClick={() => handleTabSelect('simulator')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'simulator'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-violet-600" />
                    <div className="text-left">
                      <div className="leading-tight">What-If Simulator</div>
                      <div className="text-[10px] text-slate-400 font-normal">Scenario cash-flow modeling</div>
                    </div>
                  </button>

                  <button
                    id="tool-expenses-btn"
                    type="button"
                    onClick={() => handleTabSelect('expenses')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'expenses'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ReceiptText className="w-4 h-4 text-slate-600" />
                    <div className="text-left">
                      <div className="leading-tight">Expenses Ledger</div>
                      <div className="text-[10px] text-slate-400 font-normal">Itemized transaction log</div>
                    </div>
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />

                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Guidance
                  </div>

                  <button
                    id="tool-help-btn"
                    type="button"
                    onClick={() => handleTabSelect('help')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'help'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    <div className="text-left">
                      <div className="leading-tight">Help Center</div>
                      <div className="text-[10px] text-slate-400 font-normal">Guides, FAQs & security docs</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* AI Copilot Launcher */}
            <button
              id="nav-copilot-tab"
              onClick={() => handleTabSelect('copilot')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ml-1 ${
                activeTab === 'copilot'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Copilot</span>
            </button>
          </nav>

          {/* Right Utilities & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Global Search Button */}
            {onOpenSearch && (
              <button
                id="global-search-btn"
                onClick={onOpenSearch}
                title="Global Search across all properties, assets, tasks, debts & docs (⌘K / Ctrl+K)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline text-slate-600">Search</span>
                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Notification Bell */}
            {onOpenNotifications && (
              <NotificationBell
                unreadCount={unreadNotificationCount || 0}
                onClick={onOpenNotifications}
              />
            )}

            {/* Global Document Upload Button */}
            {onOpenGlobalUpload && (
              <button
                id="global-upload-btn"
                onClick={onOpenGlobalUpload}
                title="Global Document Intake: Scan invoices, warranties, manuals"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}

            {/* Help Center Quick Access Icon */}
            <button
              id="quick-help-btn"
              type="button"
              onClick={() => handleTabSelect('help')}
              title="Open HouseMind Help Center & Knowledge Base"
              className={`p-2 rounded-xl transition cursor-pointer ${
                activeTab === 'help'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Profile / Account Dropdown Menu */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                id="profile-menu-btn"
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                aria-expanded={isProfileMenuOpen}
                className="flex items-center gap-1.5 p-1 sm:p-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                title="Account, Settings & Data Controls"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 overflow-hidden shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                  {/* User Profile Header */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.displayName || 'Household Admin'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                      <Building2 className="w-3 h-3" />
                      <span className="truncate">{homeDisplayName}</span>
                    </div>
                  </div>

                  {/* Settings & Controls */}
                  <div className="py-1">
                    <button
                      id="menu-profile-specs-btn"
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Household Profile & Specs</span>
                    </button>

                    <button
                      id="menu-data-vault-btn"
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>Data Controls & Exports</span>
                    </button>

                    {onOpenNotificationPreferences && (
                      <button
                        id="menu-notification-rules-btn"
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenNotificationPreferences();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Bell className="w-4 h-4 text-indigo-600" />
                        <span>Notification Rules</span>
                      </button>
                    )}

                    <button
                      id="menu-help-center-btn"
                      type="button"
                      onClick={() => handleTabSelect('help')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>Help & Documentation</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  {/* Demo Data Action */}
                  <div className="px-2 py-1">
                    <button
                      id="menu-seed-demo-btn"
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onSeedDemo();
                      }}
                      disabled={isSeeding}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isSeeding ? 'Seeding...' : 'Load Demo Data'}</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  {/* Sign Out */}
                  <button
                    id="menu-sign-out-btn"
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile / Tablet Hamburger Toggle */}
            <button
              id="mobile-menu-toggle-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              className="xl:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 py-4 px-2 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 duration-150">
            {/* Primary Navigation Section */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Primary Sections
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {[
                  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, color: 'text-indigo-600' },
                  { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'text-indigo-600' },
                  { id: 'properties', label: 'Properties', icon: Home, color: 'text-amber-600' },
                  { id: 'assets', label: 'Assets', icon: Wrench, color: 'text-blue-600' },
                  { id: 'maintenance', label: 'Maintenance', icon: ShieldCheck, color: 'text-emerald-600' },
                  { id: 'utilities', label: 'Utilities', icon: Zap, color: 'text-amber-500' },
                  { id: 'finances', label: 'Finances', icon: Wallet, color: 'text-emerald-600' },
                  { id: 'documents', label: 'Documents', icon: FileText, color: 'text-indigo-600' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id as NavigationTab)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tools & AI Section */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                AI & Tools
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => handleTabSelect('copilot')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                    activeTab === 'copilot'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Copilot</span>
                </button>

                <button
                  onClick={() => handleTabSelect('simulator')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'simulator'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-violet-600" />
                  <span>Simulator</span>
                </button>

                <button
                  onClick={() => handleTabSelect('expenses')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'expenses'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ReceiptText className="w-4 h-4 text-slate-500" />
                  <span>Expenses</span>
                </button>

                <button
                  onClick={() => handleTabSelect('help')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'help'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>Help Center</span>
                </button>
              </div>
            </div>

            {/* Account & Settings Shortcuts */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Household & Account
              </div>
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Household Profile & Regional Settings</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Data Vault & JSON/CSV Exports</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSeedDemo();
                  }}
                  disabled={isSeeding}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>{isSeeding ? 'Seeding Demo Data...' : 'Load Realistic Demo Data'}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({user.email})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
