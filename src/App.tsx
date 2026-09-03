import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import { api } from './lib/api';
import {
  HouseholdProfile,
  HouseholdExpense,
  HomeAsset,
  HouseholdInsight,
  GeminiInsightExplanation,
  InsightStatus,
  Property,
  Room,
  WarrantyPolicy,
  MaintenanceTask,
  UtilityAccount,
  HouseholdLoan,
  CreditCardAccount,
  HomeCommandCenterSummary,
  HouseholdDocument,
  HouseholdEntityType,
  HouseholdHealthReport,
  HouseholdNotification,
} from './types';
import { Navbar, NavigationTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/calendar/CalendarView';
import { ExpensesView } from './components/ExpensesView';
import { AssetsView } from './components/AssetsView';
import { PropertiesView } from './components/PropertiesView';
import { MaintenanceWarrantiesView } from './components/MaintenanceWarrantiesView';
import { UtilitiesDebtsView } from './components/UtilitiesDebtsView';
import { FinancialView } from './components/FinancialView';
import { DocumentManagerView } from './components/DocumentManagerView';
import { DocumentEntityExtractionModal } from './components/DocumentEntityExtractionModal';
import { GlobalUploadModal } from './components/GlobalUploadModal';
import { ScenarioSimulatorView } from './components/scenarios/ScenarioSimulatorView';
import { CopilotView } from './components/CopilotView';
import { InvestigationModal } from './components/InvestigationModal';
import { ProfileModal } from './components/ProfileModal';
import { SearchModal } from './components/SearchModal';
import { NotificationCenterModal } from './components/notifications/NotificationCenterModal';
import { NotificationPreferencesModal } from './components/notifications/NotificationPreferencesModal';
import { LandingPage } from './components/LandingPage';
import { HelpCenterView } from './components/help/HelpCenterView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App Navigation & Profile
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [profile, setProfile] = useState<HouseholdProfile | null>(null);

  // Financial & Asset Core Data
  const [expenses, setExpenses] = useState<HouseholdExpense[]>([]);
  const [assets, setAssets] = useState<HomeAsset[]>([]);
  const [insights, setInsights] = useState<HouseholdInsight[]>([]);
  const [documents, setDocuments] = useState<HouseholdDocument[]>([]);

  // Phase 10: "Run the Home" Data Store
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [warranties, setWarranties] = useState<WarrantyPolicy[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [utilities, setUtilities] = useState<UtilityAccount[]>([]);
  const [loans, setLoans] = useState<HouseholdLoan[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardAccount[]>([]);
  const [commandCenterSummary, setCommandCenterSummary] = useState<HomeCommandCenterSummary | null>(null);
  const [healthReport, setHealthReport] = useState<HouseholdHealthReport | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // UI Modals & Loading State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [investigatingInsight, setInvestigatingInsight] = useState<HouseholdInsight | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Global Entity Extractor & Global Document Intake Modals
  const [isEntityExtractorOpen, setIsEntityExtractorOpen] = useState(false);
  const [extractorTargetType, setExtractorTargetType] = useState<HouseholdEntityType | undefined>(undefined);
  const [isGlobalUploadOpen, setIsGlobalUploadOpen] = useState(false);
  const [globalUploadHint, setGlobalUploadHint] = useState<HouseholdEntityType | undefined>(undefined);

  // Global Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sub-tab states for compound views
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<'maintenance' | 'warranties'>('maintenance');
  const [utilitiesSubTab, setUtilitiesSubTab] = useState<'utilities' | 'loans' | 'cards'>('utilities');
  const [autoOpenTarget, setAutoOpenTarget] = useState<'property' | 'asset' | 'maintenance' | 'warranty' | 'utility' | 'loan' | 'card' | 'expense' | null>(null);

  const handleNavigateSubTab = (tab: NavigationTab, subTab?: string) => {
    if (tab === 'maintenance') {
      if (subTab === 'warranties') {
        setMaintenanceSubTab('warranties');
      } else {
        setMaintenanceSubTab('maintenance');
      }
    } else if (tab === 'utilities') {
      if (subTab === 'loans') {
        setUtilitiesSubTab('loans');
      } else if (subTab === 'cards') {
        setUtilitiesSubTab('cards');
      } else {
        setUtilitiesSubTab('utilities');
      }
    }
    setActiveTab(tab);
  };

  const handleAddOption = (optionId: string) => {
    switch (optionId) {
      case 'property':
        setActiveTab('properties');
        setAutoOpenTarget('property');
        break;
      case 'asset':
        setActiveTab('assets');
        setAutoOpenTarget('asset');
        break;
      case 'maintenance':
        setActiveTab('maintenance');
        setMaintenanceSubTab('maintenance');
        setAutoOpenTarget('maintenance');
        break;
      case 'warranty':
        setActiveTab('maintenance');
        setMaintenanceSubTab('warranties');
        setAutoOpenTarget('warranty');
        break;
      case 'utility':
        setActiveTab('utilities');
        setUtilitiesSubTab('utilities');
        setAutoOpenTarget('utility');
        break;
      case 'loan':
        setActiveTab('utilities');
        setUtilitiesSubTab('loans');
        setAutoOpenTarget('loan');
        break;
      case 'card':
        setActiveTab('utilities');
        setUtilitiesSubTab('cards');
        setAutoOpenTarget('card');
        break;
      case 'expense':
        setActiveTab('expenses');
        setAutoOpenTarget('expense');
        break;
      case 'document':
        handleOpenGlobalUpload();
        break;
      default:
        break;
    }
  };

  // Phase 6: Notifications & Preferences State
  const [notifications, setNotifications] = useState<HouseholdNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isNotificationPreferencesOpen, setIsNotificationPreferencesOpen] = useState<boolean>(false);

  const loadNotifications = useCallback(async () => {
    if (!auth.currentUser) return;
    setIsLoadingNotifications(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadNotificationCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkNotificationUnread = async (id: string) => {
    try {
      await api.markNotificationUnread(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false, readAt: undefined } : n))
      );
      setUnreadNotificationCount((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to mark notification unread:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadNotificationCount(0);
      addToast('success', 'Notifications Updated', 'All active alerts marked as read.');
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleDismissNotification = async (id: string) => {
    try {
      await api.dismissNotification(id);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) {
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
      }
      addToast('info', 'Notification Dismissed');
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch comprehensive household data
  const loadHouseholdData = useCallback(async () => {
    if (!auth.currentUser) return;
    setIsLoadingData(true);
    setIsLoadingInsights(true);
    try {
      const [
        profileData,
        expensesData,
        assetsData,
        insightsData,
        propertiesData,
        roomsData,
        warrantiesData,
        tasksData,
        utilitiesData,
        loansData,
        cardsData,
        summaryData,
        docsData,
        healthData,
      ] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getExpenses().catch(() => []),
        api.getAssets().catch(() => []),
        api.getInsights().catch(() => []),
        api.getProperties().catch(() => []),
        api.getRooms().catch(() => []),
        api.getWarranties().catch(() => []),
        api.getMaintenanceTasks().catch(() => []),
        api.getUtilities().catch(() => []),
        api.getLoans().catch(() => []),
        api.getCreditCards().catch(() => []),
        api.getHomeCommandCenterSummary().catch(() => null),
        api.getDocuments().catch(() => []),
        api.getHouseholdHealth().catch(() => null),
      ]);

      if (profileData) setProfile(profileData);
      if (expensesData) setExpenses(expensesData);
      if (assetsData) setAssets(assetsData);
      if (insightsData) setInsights(insightsData);
      if (propertiesData) setProperties(propertiesData);
      if (roomsData) setRooms(roomsData);
      if (warrantiesData) setWarranties(warrantiesData);
      if (tasksData) setTasks(tasksData);
      if (utilitiesData) setUtilities(utilitiesData);
      if (loansData) setLoans(loansData);
      if (cardsData) setCreditCards(cardsData);
      if (summaryData) setCommandCenterSummary(summaryData);
      if (docsData) setDocuments(docsData);
      if (healthData) setHealthReport(healthData);

      loadNotifications();
    } catch (err: any) {
      console.error('Failed to load complete household data:', err);
      addToast('error', 'Sync Warning', 'Could not load all household systems from cloud.');
    } finally {
      setIsLoadingData(false);
      setIsLoadingInsights(false);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    // Safely scrub any unsupported demo, guest, or test query parameters without altering auth state
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const url = new URL(window.location.href);
        const paramsToScrub = ['demo', 'guest', 'anonymous', 'isDemo', 'demoMode', 'guestMode', 'demoUser', 'demoTenant'];
        let modified = false;
        for (const param of paramsToScrub) {
          if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            modified = true;
          }
        }
        // Also scrub malformed queries like ?demo==true or ?guest==true
        if (url.search.includes('demo=') || url.search.includes('guest=') || url.search.includes('anonymous=')) {
          url.search = '';
          modified = true;
        }
        if (modified) {
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
        }
      } catch {
        // Ignore URL parsing errors
      }
    }

    // In local development test runs, allow explicit Playwright fixture injection (tree-shaken in production)
    if (import.meta.env.DEV && typeof window !== 'undefined' && (window as any).__PLAYWRIGHT_TEST_USER__) {
      const fixtureUser = (window as any).__PLAYWRIGHT_TEST_USER__;
      setUser(fixtureUser);
      setAuthToken(fixtureUser.testToken || 'test-token-e2e-01');
      setIsAuthChecking(false);
      loadHouseholdData();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      if (currentUser) {
        try {
          const tok = await currentUser.getIdToken();
          setAuthToken(tok);
        } catch (tokErr) {
          console.error('Error fetching auth token:', tokErr);
        }
        loadHouseholdData();
      } else {
        setAuthToken('');
        setProfile(null);
        setExpenses([]);
        setAssets([]);
        setInsights([]);
        setProperties([]);
        setRooms([]);
        setWarranties([]);
        setTasks([]);
        setUtilities([]);
        setLoans([]);
        setCreditCards([]);
        setCommandCenterSummary(null);
        setDocuments([]);
        setInvestigatingInsight(null);
      }
    });
    return () => unsubscribe();
  }, [loadHouseholdData]);

  // Auth actions
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      await signInWithPopup(auth, googleProvider);
      addToast('success', 'Welcome to HouseMind', 'Successfully signed in to your household vault.');
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setAuthError(errorMsg);
      addToast('error', 'Authentication Failed', errorMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      addToast('info', 'Signed Out', 'You have been safely signed out.');
    } catch (err: unknown) {
      console.error('Sign-out error:', err);
    }
  };

  // Seed Demo Data
  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      const result = await api.seedDemoData();
      await loadHouseholdData();
      addToast(
        'success',
        'Realistic Household Data Loaded',
        `Seeded properties, assets, maintenance schedules, warranties, utilities, and financial ledger.`
      );
    } catch (err: any) {
      console.error('Seed demo error:', err);
      addToast('error', 'Seeding Failed', err.message || 'Failed to populate starter data.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async (updated: Partial<HouseholdProfile>) => {
    const saved = await api.updateProfile(updated);
    setProfile(saved);
    addToast('success', 'Profile Updated', 'Household settings saved successfully.');
  };

  // Expenses CRUD
  const handleAddExpense = async (
    expenseData: Omit<HouseholdExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    const created = await api.createExpense(expenseData);
    setExpenses((prev) => [created, ...prev]);
    addToast('success', 'Expense Created', `Added "${created.title}".`);
  };

  const handleUpdateExpense = async (id: string, updated: Partial<HouseholdExpense>) => {
    const saved = await api.updateExpense(id, updated);
    setExpenses((prev) => prev.map((e) => (e.id === id ? saved : e)));
    addToast('success', 'Expense Updated', `Saved changes to "${saved.title}".`);
  };

  const handleDeleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addToast('info', 'Expense Deleted', 'Record permanently removed.');
  };

  // Assets CRUD
  const handleAddAsset = async (
    assetData: Omit<HomeAsset, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    const created = await api.createAsset(assetData);
    setAssets((prev) => [created, ...prev]);
    addToast('success', 'Asset Registered', `Added "${created.name}".`);
  };

  const handleUpdateAsset = async (id: string, updated: Partial<HomeAsset>) => {
    const saved = await api.updateAsset(id, updated);
    setAssets((prev) => prev.map((a) => (a.id === id ? saved : a)));
    addToast('success', 'Asset Updated', `Saved changes to "${saved.name}".`);
  };

  const handleDeleteAsset = async (id: string) => {
    await api.deleteAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    addToast('info', 'Asset Deleted', 'Asset record removed.');
  };

  // Intelligence & Investigator Handlers
  const handleRefreshInsights = async () => {
    try {
      setIsLoadingInsights(true);
      const freshInsights = await api.refreshInsights();
      setInsights(freshInsights);
      addToast(
        'success',
        'Scans Complete',
        `Evaluated household data: ${freshInsights.length} active/tracked finding${
          freshInsights.length !== 1 ? 's' : ''
        }.`
      );
    } catch (err: any) {
      console.error('Refresh insights error:', err);
      addToast('error', 'Scan Error', err.message || 'Failed to refresh household insights.');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleInvestigateInsight = (insight: HouseholdInsight) => {
    setInvestigatingInsight(insight);
    if (insight.status === 'new') {
      api.updateInsightStatus(insight.id, 'viewed').catch(console.error);
      setInsights((prev) =>
        prev.map((i) => (i.id === insight.id ? { ...i, status: 'viewed' } : i))
      );
    }
  };

  const handleUpdateInsightStatus = async (id: string, status: InsightStatus) => {
    try {
      await api.updateInsightStatus(id, status);
      setInsights((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status } : i))
      );
      if (investigatingInsight && investigatingInsight.id === id) {
        setInvestigatingInsight((prev) => (prev ? { ...prev, status } : null));
      }
      addToast('success', 'Status Updated', `Insight marked as ${status}.`);
    } catch (err: any) {
      console.error('Update status error:', err);
      addToast('error', 'Update Failed', err.message || 'Failed to update status.');
    }
  };

  const handleExplainInsight = async (id: string): Promise<GeminiInsightExplanation> => {
    const explanation = await api.explainInsight(id);
    setInsights((prev) =>
      prev.map((i) => (i.id === id ? { ...i, geminiExplanation: explanation } : i))
    );
    if (investigatingInsight && investigatingInsight.id === id) {
      setInvestigatingInsight((prev) =>
        prev ? { ...prev, geminiExplanation: explanation } : null
      );
    }
    return explanation;
  };

  const handleOpenGlobalExtractor = (type?: HouseholdEntityType) => {
    setExtractorTargetType(type);
    setIsEntityExtractorOpen(true);
  };

  const handleOpenGlobalUpload = (hint?: HouseholdEntityType) => {
    setGlobalUploadHint(hint);
    setIsGlobalUploadOpen(true);
  };

  // Loading Screen during initial session check
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <div className="text-sm text-slate-400 font-medium tracking-wide">
          Verifying security credentials...
        </div>
      </div>
    );
  }

  // If not logged in, render the landing page
  if (!user) {
    return (
      <>
        <LandingPage
          onSignIn={handleGoogleSignIn}
          isAuthenticating={isAuthenticating}
          authError={authError}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={user}
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigateSubTab={handleNavigateSubTab}
        onAddOption={handleAddOption}
        maintenanceSubTab={maintenanceSubTab}
        utilitiesSubTab={utilitiesSubTab}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onSeedDemo={handleSeedDemo}
        onSignOut={handleSignOut}
        isSeeding={isSeeding}
        onOpenGlobalUpload={() => handleOpenGlobalUpload()}
        onOpenSearch={() => setIsSearchOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenNotificationPreferences={() => setIsNotificationPreferencesOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary fallbackTitle="View Rendering Error">
          {activeTab === 'dashboard' && (
            <Dashboard
              profile={profile}
              expenses={expenses}
              assets={assets}
              insights={insights}
              isLoadingInsights={isLoadingInsights}
              onNavigate={(tab) => setActiveTab(tab as NavigationTab)}
              onOpenAddExpense={() => setActiveTab('expenses')}
              onOpenAddAsset={() => setActiveTab('assets')}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onSeedDemo={handleSeedDemo}
              onRefreshInsights={handleRefreshInsights}
              onInvestigateInsight={handleInvestigateInsight}
              onUpdateInsightStatus={handleUpdateInsightStatus}
              isSeeding={isSeeding}
              onOpenGlobalUpload={() => handleOpenGlobalUpload()}
              healthReport={healthReport}
              isLoadingHealth={isLoadingHealth}
              onRefreshHealth={async () => {
                try {
                  setIsLoadingHealth(true);
                  const report = await api.getHouseholdHealth();
                  setHealthReport(report);
                } catch (err) {
                  console.error('Failed to refresh health:', err);
                } finally {
                  setIsLoadingHealth(false);
                }
              }}
              properties={properties}
              rooms={rooms}
              warranties={warranties}
              tasks={tasks}
              utilities={utilities}
              loans={loans}
              creditCards={creditCards}
              documents={documents}
              commandCenterSummary={commandCenterSummary}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              onNavigateTab={(tab, subTab, entityId) => {
                setActiveTab(tab as NavigationTab);
              }}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenNotificationPreferences={() => setIsNotificationPreferencesOpen(true)}
              addToast={addToast}
            />
          )}

          {activeTab === 'properties' && (
            <PropertiesView
              properties={properties}
              rooms={rooms}
              assets={assets}
              onRefresh={loadHouseholdData}
              onOpenEntityExtractor={() => handleOpenGlobalExtractor('asset')}
              addToast={addToast}
              currency={profile?.currency || 'USD'}
              autoOpenAdd={autoOpenTarget === 'property'}
              onAddModalOpened={() => setAutoOpenTarget(null)}
            />
          )}

          {activeTab === 'assets' && (
            <AssetsView
              assets={assets}
              currency={profile?.currency || 'USD'}
              isLoading={isLoadingData}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
              autoOpenAdd={autoOpenTarget === 'asset'}
              onAddModalOpened={() => setAutoOpenTarget(null)}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceWarrantiesView
              tasks={tasks}
              warranties={warranties}
              assets={assets}
              properties={properties}
              onRefresh={loadHouseholdData}
              onOpenEntityExtractor={(type) => handleOpenGlobalExtractor(type)}
              addToast={addToast}
              currency={profile?.currency || 'USD'}
              initialSubTab={maintenanceSubTab}
              onSubTabChange={(sub) => setMaintenanceSubTab(sub)}
              autoOpenAdd={autoOpenTarget === 'maintenance' || autoOpenTarget === 'warranty'}
              onAddModalOpened={() => setAutoOpenTarget(null)}
            />
          )}

          {activeTab === 'utilities' && (
            <UtilitiesDebtsView
              utilities={utilities}
              loans={loans}
              creditCards={creditCards}
              properties={properties}
              onRefresh={loadHouseholdData}
              onOpenEntityExtractor={(type) => handleOpenGlobalExtractor(type)}
              addToast={addToast}
              currency={profile?.currency || 'USD'}
              initialTab={utilitiesSubTab}
              onTabChange={(tab) => setUtilitiesSubTab(tab)}
              autoOpenAddType={
                autoOpenTarget === 'utility' ? 'utility' :
                autoOpenTarget === 'loan' ? 'loan' :
                autoOpenTarget === 'card' ? 'card' : null
              }
              onAddModalOpened={() => setAutoOpenTarget(null)}
            />
          )}

          {activeTab === 'finances' && (
            <FinancialView
              token={authToken}
              profile={profile}
              onNavigateToDocuments={() => setActiveTab('documents')}
              onShowToast={(msg, type) =>
                addToast(type || 'info', type === 'error' ? 'Finance Alert' : 'Finance Update', msg)
              }
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              currency={profile?.currency || 'USD'}
              isLoading={isLoadingData}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              autoOpenAdd={autoOpenTarget === 'expense'}
              onAddModalOpened={() => setAutoOpenTarget(null)}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentManagerView
              token={authToken}
              profile={profile}
              onShowToast={(msg, type) =>
                addToast(type || 'info', type === 'error' ? 'Document Alert' : 'Document Processed', msg)
              }
            />
          )}

          {activeTab === 'simulator' && (
            <ScenarioSimulatorView
              currency={profile?.currency || 'USD'}
              assets={assets}
            />
          )}

          {activeTab === 'copilot' && (
            <CopilotView
              profile={profile}
              expenses={expenses}
              assets={assets}
              onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
            />
          )}

          {activeTab === 'help' && (
            <HelpCenterView
              onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
              onOpenGlobalUpload={() => handleOpenGlobalUpload()}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenNotificationPreferences={() => setIsNotificationPreferencesOpen(true)}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Phase 2: Global Upload & AI Document Intake Modal */}
      {isGlobalUploadOpen && (
        <GlobalUploadModal
          isOpen={isGlobalUploadOpen}
          onClose={() => setIsGlobalUploadOpen(false)}
          documents={documents}
          assets={assets}
          properties={properties}
          currency={profile?.currency || 'USD'}
          initialDomainHint={globalUploadHint}
          onDocumentProcessed={(res) => {
            loadHouseholdData();
            if (res.destinationTab) {
              setActiveTab(res.destinationTab as NavigationTab);
            }
          }}
          onNavigateToTab={(tab) => setActiveTab(tab as NavigationTab)}
          addToast={addToast}
        />
      )}

      {/* Global Document Entity Extraction Modal */}
      {isEntityExtractorOpen && (
        <DocumentEntityExtractionModal
          isOpen={isEntityExtractorOpen}
          onClose={() => setIsEntityExtractorOpen(false)}
          documents={documents}
          preselectedEntityType={extractorTargetType}
          currency={profile?.currency || 'USD'}
          onEntitySaved={(type, entity) => {
            loadHouseholdData();
            addToast(
              'success',
              'Record Saved',
              `Successfully added new ${type.replace('_', ' ')} record to your household system.`
            );
          }}
          addToast={addToast}
        />
      )}

      {/* Investigation Modal */}
      {investigatingInsight && (
        <InvestigationModal
          insight={investigatingInsight}
          expenses={expenses}
          assets={assets}
          onClose={() => setInvestigatingInsight(null)}
          onUpdateStatus={handleUpdateInsightStatus}
          onExplainInsight={handleExplainInsight}
          onNavigateToEntity={(type) => {
            setActiveTab(type === 'expense' ? 'expenses' : 'assets');
          }}
        />
      )}

      {/* Profile Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        profile={profile}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
        onDataChanged={loadHouseholdData}
        addToast={addToast}
      />

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab, targetId, targetSubTab) => {
          setIsSearchOpen(false);
          setActiveTab(tab);
        }}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadNotificationCount}
        isLoading={isLoadingNotifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkUnread={handleMarkNotificationUnread}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onDismiss={handleDismissNotification}
        onRefresh={loadNotifications}
        onOpenPreferences={() => {
          setIsNotificationsOpen(false);
          setIsNotificationPreferencesOpen(true);
        }}
        onNavigateToSource={(tab, subTab, sourceId) => {
          setIsNotificationsOpen(false);
          setActiveTab(tab as NavigationTab);
        }}
      />

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isNotificationPreferencesOpen}
        onClose={() => setIsNotificationPreferencesOpen(false)}
        onSaved={() => {
          loadNotifications();
        }}
        addToast={addToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
