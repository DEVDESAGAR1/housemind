import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Plus,
  Landmark,
  CreditCard,
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

export type AddOptionType =
  | 'property'
  | 'asset'
  | 'maintenance'
  | 'warranty'
  | 'issue'
  | 'utility'
  | 'loan'
  | 'credit_card'
  | 'expense'
  | 'document';

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
  onAddOption?: (option: AddOptionType) => void;
  onNavigateSubTab?: (tab: NavigationTab, subTab?: string) => void;
  maintenanceSubTab?: 'maintenance' | 'warranties' | 'issues';
  utilitiesSubTab?: 'utilities' | 'loans' | 'cards';
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
  unreadNotificationCount = 0,
  onOpenNotifications,
  onOpenNotificationPreferences,
  onAddOption,
  onNavigateSubTab,
  maintenanceSubTab = 'maintenance',
  utilitiesSubTab = 'utilities',
}: NavbarProps) {
  // Active open dropdown: 'home' | 'assets' | 'finances' | 'more' | 'add' | 'profile' | null
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navContainerRef = useRef<HTMLDivElement>(null);

  const homeDisplayName =
    profile?.homeName || (user?.displayName ? `${user.displayName}'s Home` : 'Primary Residence');

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleTabSelect = useCallback(
    (tab: NavigationTab, subTab?: string) => {
      if (onNavigateSubTab) {
        onNavigateSubTab(tab, subTab);
      } else {
        setActiveTab(tab);
      }
      setOpenMenu(null);
      setIsMobileMenuOpen(false);
    },
    [onNavigateSubTab, setActiveTab]
  );

  const handleAddClick = useCallback(
    (option: AddOptionType) => {
      setOpenMenu(null);
      setIsMobileMenuOpen(false);
      if (option === 'document') {
        if (onOpenGlobalUpload) onOpenGlobalUpload();
      } else if (onAddOption) {
        onAddOption(option);
      } else {
        // Fallback navigation
        switch (option) {
          case 'property':
            handleTabSelect('properties');
            break;
          case 'asset':
            handleTabSelect('assets');
            break;
          case 'maintenance':
            handleTabSelect('maintenance', 'maintenance');
            break;
          case 'utility':
            handleTabSelect('utilities', 'utilities');
            break;
          case 'loan':
            handleTabSelect('utilities', 'loans');
            break;
          case 'credit_card':
            handleTabSelect('utilities', 'cards');
            break;
          case 'expense':
            handleTabSelect('expenses');
            break;
        }
      }
    },
    [handleTabSelect, onAddOption, onOpenGlobalUpload]
  );

  // Determine group active states
  const isHomeActive =
    activeTab === 'properties' ||
    (activeTab === 'maintenance' && maintenanceSubTab === 'maintenance') ||
    (activeTab === 'utilities' && utilitiesSubTab === 'utilities');

  const isAssetsActive =
    activeTab === 'assets' ||
    (activeTab === 'maintenance' && maintenanceSubTab === 'warranties');

  const isFinancesActive =
    activeTab === 'finances' ||
    activeTab === 'expenses' ||
    (activeTab === 'utilities' && (utilitiesSubTab === 'loans' || utilitiesSubTab === 'cards'));

  const isMoreActive =
    activeTab === 'calendar' ||
    activeTab === 'documents' ||
    activeTab === 'simulator' ||
    activeTab === 'copilot' ||
    activeTab === 'help';

  const toggleMenu = (name: string) => {
    setOpenMenu((prev) => (prev === name ? null : name));
  };

  return (
    <header
      ref={navContainerRef}
      id="main-navbar-header"
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200"
    >
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* ========================================================= */}
          {/* 1. BRAND                                                  */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="nav-brand-btn"
              onClick={() => handleTabSelect('dashboard')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-hidden"
              title="Return to Command Center"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shadow-indigo-600/20 group-hover:scale-105 transition-transform shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-sm md:text-base block group-hover:text-indigo-600 transition-colors leading-tight">
                  HouseMind
                </span>
                <span className="hidden sm:block text-[11px] text-slate-500 font-medium truncate max-w-[110px] sm:max-w-[140px] leading-tight">
                  {homeDisplayName}
                </span>
              </div>
            </button>
          </div>

          {/* ========================================================= */}
          {/* 2. PRIMARY NAV (Desktop: >=1024px)                        */}
          {/* ========================================================= */}
          <nav
            id="primary-desktop-navigation"
            aria-label="Primary"
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 min-w-0 flex-1 justify-start ml-2 xl:ml-6"
          >
            {/* Command Center */}
            <button
              id="nav-dashboard-tab"
              type="button"
              onClick={() => handleTabSelect('dashboard')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>

            {/* HOME Dropdown */}
            <div className="relative">
              <button
                id="nav-home-group-btn"
                type="button"
                onClick={() => toggleMenu('home')}
                aria-expanded={openMenu === 'home'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isHomeActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-3.5 h-3.5 text-amber-600" />
                <span>Home</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    openMenu === 'home' ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {openMenu === 'home' && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left max-w-[calc(100vw-2rem)]">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Home Spaces & Operations
                  </div>

                  <button
                    id="nav-properties-tab"
                    type="button"
                    onClick={() => handleTabSelect('properties')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'properties'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Home className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Properties</div>
                      <div className="text-[10px] text-slate-400 truncate">Spaces, rooms & specs</div>
                    </div>
                  </button>

                  <button
                    id="nav-maintenance-tab"
                    type="button"
                    onClick={() => handleTabSelect('maintenance', 'maintenance')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'maintenance' && maintenanceSubTab === 'maintenance'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Maintenance</div>
                      <div className="text-[10px] text-slate-400 truncate">Schedules & task tracking</div>
                    </div>
                  </button>

                  <button
                    id="nav-utilities-tab"
                    type="button"
                    onClick={() => handleTabSelect('utilities', 'utilities')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'utilities' && utilitiesSubTab === 'utilities'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Utilities</div>
                      <div className="text-[10px] text-slate-400 truncate">Electric, gas, water & bills</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* ASSETS Dropdown */}
            <div className="relative">
              <button
                id="nav-assets-group-btn"
                type="button"
                onClick={() => toggleMenu('assets')}
                aria-expanded={openMenu === 'assets'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isAssetsActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                <span>Assets</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    openMenu === 'assets' ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {openMenu === 'assets' && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left max-w-[calc(100vw-2rem)]">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Household Equipment & Protection
                  </div>

                  <button
                    id="nav-assets-tab"
                    type="button"
                    onClick={() => handleTabSelect('assets')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'assets'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Assets & Equipment</div>
                      <div className="text-[10px] text-slate-400 truncate">HVAC, appliances & fixtures</div>
                    </div>
                  </button>

                  <button
                    id="nav-item-warranties"
                    type="button"
                    onClick={() => handleTabSelect('maintenance', 'warranties')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'maintenance' && maintenanceSubTab === 'warranties'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Warranties</div>
                      <div className="text-[10px] text-slate-400 truncate">Coverage policies & expiry dates</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* FINANCES Dropdown */}
            <div className="relative">
              <button
                id="nav-finances-group-btn"
                type="button"
                onClick={() => toggleMenu('finances')}
                aria-expanded={openMenu === 'finances'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isFinancesActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Finances</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    openMenu === 'finances' ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {openMenu === 'finances' && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left max-w-[calc(100vw-2rem)]">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Household Finances & Cash Flow
                  </div>

                  <button
                    id="nav-finances-tab"
                    type="button"
                    onClick={() => handleTabSelect('finances')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'finances'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Transactions</div>
                      <div className="text-[10px] text-slate-400 truncate">Cash flow & financial overview</div>
                    </div>
                  </button>

                  <button
                    id="nav-item-expenses"
                    type="button"
                    onClick={() => handleTabSelect('expenses')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'expenses'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ReceiptText className="w-4 h-4 text-slate-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Expenses</div>
                      <div className="text-[10px] text-slate-400 truncate">Itemized transaction log</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    id="nav-item-loans"
                    type="button"
                    onClick={() => handleTabSelect('utilities', 'loans')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'utilities' && utilitiesSubTab === 'loans'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Loans</div>
                      <div className="text-[10px] text-slate-400 truncate">Mortgages & amortization</div>
                    </div>
                  </button>

                  <button
                    id="nav-item-cards"
                    type="button"
                    onClick={() => handleTabSelect('utilities', 'cards')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'utilities' && utilitiesSubTab === 'cards'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Credit Cards</div>
                      <div className="text-[10px] text-slate-400 truncate">Balances & statement cycles</div>
                    </div>
                  </button>

                  <button
                    id="nav-item-bills"
                    type="button"
                    onClick={() => handleTabSelect('utilities', 'utilities')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'utilities' && utilitiesSubTab === 'utilities'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Bills</div>
                      <div className="text-[10px] text-slate-400 truncate">Recurring utility accounts</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* MORE Dropdown */}
            <div className="relative">
              <button
                id="nav-more-menu-btn"
                type="button"
                onClick={() => toggleMenu('more')}
                aria-expanded={openMenu === 'more'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isMoreActive
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>More</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    openMenu === 'more' ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {openMenu === 'more' && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left max-w-[calc(100vw-2rem)]">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Extended Capabilities
                  </div>

                  <button
                    id="nav-calendar-tab"
                    type="button"
                    onClick={() => handleTabSelect('calendar')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'calendar'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Calendar</div>
                      <div className="text-[10px] text-slate-400 truncate">Integrated household schedule</div>
                    </div>
                  </button>

                  <button
                    id="nav-documents-tab"
                    type="button"
                    onClick={() => handleTabSelect('documents')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'documents'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Documents</div>
                      <div className="text-[10px] text-slate-400 truncate">Vault, scans & digital records</div>
                    </div>
                  </button>

                  <button
                    id="nav-simulator-tab"
                    type="button"
                    onClick={() => handleTabSelect('simulator')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'simulator'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-violet-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">What-If Simulator</div>
                      <div className="text-[10px] text-slate-400 truncate">Scenario cash-flow modeling</div>
                    </div>
                  </button>

                  <button
                    id="nav-copilot-tab"
                    type="button"
                    onClick={() => handleTabSelect('copilot')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      activeTab === 'copilot'
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Copilot</div>
                      <div className="text-[10px] text-slate-400 truncate">AI household assistant</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

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
                    <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight font-semibold">Help Center</div>
                      <div className="text-[10px] text-slate-400 truncate">Guides, FAQs & security docs</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* ========================================================= */}
          {/* 3. PROTECTED RIGHT ACTION ZONE                            */}
          {/* (Contains: + Add, Search, Notifications, Profile)         */}
          {/* Priority layout: never squeezed or overlapped             */}
          {/* ========================================================= */}
          <div
            id="protected-right-action-zone"
            className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto z-10"
          >
            {/* 3a. + ADD Entry Point */}
            <div className="relative">
              <button
                id="nav-add-btn"
                type="button"
                onClick={() => toggleMenu('add')}
                aria-expanded={openMenu === 'add'}
                title="Add new household record or document"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs shadow-indigo-600/20 transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add</span>
                <ChevronDown
                  className={`w-3 h-3 text-indigo-200 transition-transform ${
                    openMenu === 'add' ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {openMenu === 'add' && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left max-w-[calc(100vw-2rem)]">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Add Household Record
                  </div>

                  <button
                    id="add-opt-property"
                    type="button"
                    onClick={() => handleAddClick('property')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Property</span>
                  </button>

                  <button
                    id="add-opt-asset"
                    type="button"
                    onClick={() => handleAddClick('asset')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Asset</span>
                  </button>

                  <button
                    id="add-opt-maintenance"
                    type="button"
                    onClick={() => handleAddClick('maintenance')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Maintenance</span>
                  </button>

                  <button
                    id="add-opt-utility"
                    type="button"
                    onClick={() => handleAddClick('utility')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Utility / Bill</span>
                  </button>

                  <button
                    id="add-opt-loan"
                    type="button"
                    onClick={() => handleAddClick('loan')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Loan</span>
                  </button>

                  <button
                    id="add-opt-card"
                    type="button"
                    onClick={() => handleAddClick('credit_card')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Credit Card</span>
                  </button>

                  <button
                    id="add-opt-expense"
                    type="button"
                    onClick={() => handleAddClick('expense')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ReceiptText className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Expense</span>
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />

                  <button
                    id="add-opt-document"
                    type="button"
                    onClick={() => handleAddClick('document')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="leading-tight">Document (Upload & Scan)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Extract receipts, bills & manuals</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3b. Search Button (Visible on sm+; in mobile drawer for small screens) */}
            {onOpenSearch && (
              <button
                id="global-search-btn"
                type="button"
                onClick={onOpenSearch}
                title="Global Search across all properties, assets, tasks, debts & docs (⌘K / Ctrl+K)"
                className="hidden sm:inline-flex items-center gap-1 sm:gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl transition cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden xl:inline text-slate-600">Search</span>
                <kbd className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* 3c. Notification Bell */}
            {onOpenNotifications && (
              <div className="shrink-0">
                <NotificationBell
                  unreadCount={unreadNotificationCount || 0}
                  onClick={onOpenNotifications}
                />
              </div>
            )}

            {/* 3d. Profile Menu */}
            <div className="relative shrink-0">
              <button
                id="profile-menu-btn"
                type="button"
                onClick={() => toggleMenu('profile')}
                aria-expanded={openMenu === 'profile'}
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

              {openMenu === 'profile' && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left max-w-[calc(100vw-2rem)]">
                  {/* User Profile Header */}
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.displayName || 'Household Admin'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{homeDisplayName}</span>
                    </div>
                  </div>

                  {/* Settings & Controls */}
                  <div className="py-1">
                    <button
                      id="menu-profile-specs-btn"
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Household Profile & Specs</span>
                    </button>

                    <button
                      id="menu-data-vault-btn"
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Data Controls & Exports</span>
                    </button>

                    {onOpenNotificationPreferences && (
                      <button
                        id="menu-notification-rules-btn"
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          onOpenNotificationPreferences();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Notification Rules</span>
                      </button>
                    )}

                    <button
                      id="menu-help-center-btn"
                      type="button"
                      onClick={() => handleTabSelect('help')}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
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
                        setOpenMenu(null);
                        onSeedDemo();
                      }}
                      disabled={isSeeding}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{isSeeding ? 'Seeding...' : 'Load Demo Data'}</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  {/* Sign Out */}
                  <button
                    id="menu-sign-out-btn"
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile / Tablet Hamburger Toggle (Visible <=1024px) */}
            <button
              id="mobile-menu-toggle-btn"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              title="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE / TABLET DRAWER MENU (<=1024px)                    */}
        {/* ========================================================= */}
        {isMobileMenuOpen && (
          <div
            id="mobile-navigation-drawer"
            className="lg:hidden border-t border-slate-200 py-4 px-2 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 duration-150"
          >
            {/* Quick Search on Mobile */}
            {onOpenSearch && (
              <button
                id="mobile-drawer-search-btn"
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSearch();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-medium text-slate-700 transition cursor-pointer border border-slate-200/60"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Search all household records...</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* PRIMARY SECTIONS */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Primary Sections
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {/* Command Center */}
                <button
                  type="button"
                  onClick={() => handleTabSelect('dashboard')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Command Center</span>
                </button>

                {/* Home */}
                <button
                  type="button"
                  onClick={() => handleTabSelect('properties')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    isHomeActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Home className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Home (Properties, Tasks, Utilities)</span>
                </button>

                {/* Assets */}
                <button
                  type="button"
                  onClick={() => handleTabSelect('assets')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    isAssetsActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Assets & Equipment</span>
                </button>

                {/* Finances */}
                <button
                  type="button"
                  onClick={() => handleTabSelect('finances')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    isFinancesActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Finances (Cash Flow, Debts & Bills)</span>
                </button>
              </div>
            </div>

            {/* TOOLS & MORE */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tools & Knowledge
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleTabSelect('calendar')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'calendar'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Calendar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('documents')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'documents'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Documents</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('simulator')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'simulator'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-violet-600 shrink-0" />
                  <span>Simulator</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('copilot')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                    activeTab === 'copilot'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>AI Copilot</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSelect('help')}
                  className={`col-span-2 flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    activeTab === 'help'
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Help Center & Documentation</span>
                </button>
              </div>
            </div>

            {/* ACCOUNT & PROFILE */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Account & Controls
              </div>
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Household Profile & Specs</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 shrink-0" />
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
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>{isSeeding ? 'Seeding Demo Data...' : 'Load Realistic Demo Data'}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
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
