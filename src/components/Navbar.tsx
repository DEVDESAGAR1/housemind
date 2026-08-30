import {
  Building2,
  LayoutDashboard,
  ReceiptText,
  Wrench,
  Sparkles,
  User as UserIcon,
  LogOut,
  Settings,
  Wallet,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { HouseholdProfile } from '../types';

export type NavigationTab =
  | 'dashboard'
  | 'expenses'
  | 'assets'
  | 'finances'
  | 'documents'
  | 'simulator'
  | 'copilot';

interface NavbarProps {
  user: User;
  profile: HouseholdProfile | null;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenProfile: () => void;
  onSeedDemo: () => void;
  onSignOut: () => void;
  isSeeding: boolean;
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
}: NavbarProps) {
  const homeDisplayName = profile?.homeName || 'My Household';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Home Name */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-base">HouseMind</span>
                <span className="block text-[11px] text-slate-500 font-medium truncate max-w-[120px] sm:max-w-[180px]">
                  {homeDisplayName}
                </span>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="hidden lg:flex items-center gap-1 ml-4 border-l border-slate-200 pl-4">
              <button
                id="nav-dashboard-tab"
                onClick={() => setActiveTab('dashboard')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                id="nav-finances-tab"
                onClick={() => setActiveTab('finances')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'finances'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Finances</span>
              </button>

              <button
                id="nav-documents-tab"
                onClick={() => setActiveTab('documents')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'documents'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Documents</span>
              </button>

              <button
                id="nav-expenses-tab"
                onClick={() => setActiveTab('expenses')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'expenses'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ReceiptText className="w-4 h-4" />
                <span>Expenses</span>
              </button>

              <button
                id="nav-assets-tab"
                onClick={() => setActiveTab('assets')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'assets'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Assets</span>
              </button>

              <button
                id="nav-simulator-tab"
                onClick={() => setActiveTab('simulator')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'simulator'
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-violet-600" />
                <span>What-If Simulator</span>
              </button>

              <button
                id="nav-copilot-tab"
                onClick={() => setActiveTab('copilot')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'copilot'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-600 hover:bg-indigo-50/80'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Copilot</span>
              </button>
            </nav>
          </div>


          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Demo Data Button */}
            <button
              id="seed-demo-data-btn"
              onClick={onSeedDemo}
              disabled={isSeeding}
              title="Populate realistic starter household data"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isSeeding ? 'Seeding...' : 'Load Demo Data'}</span>
            </button>

            {/* Profile Settings */}
            <button
              id="open-profile-btn"
              onClick={onOpenProfile}
              className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
              title="Household Profile Settings"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* User Details & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex lg:hidden items-center justify-around py-2.5 border-t border-slate-100 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'finances' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Finances</span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'documents' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Docs</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'expenses' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Expenses</span>
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'assets' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Assets</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'simulator' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-violet-600" />
            <span>Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('copilot')}
            className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'copilot' ? 'bg-indigo-600 text-white font-semibold' : 'text-indigo-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Copilot</span>
          </button>
        </div>
      </div>
    </header>
  );
}

