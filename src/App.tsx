/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
} from './types';

import { LandingPage } from './components/LandingPage';
import { Navbar, NavigationTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ExpensesView } from './components/ExpensesView';
import { AssetsView } from './components/AssetsView';
import { CopilotView } from './components/CopilotView';
import { FinancialView } from './components/FinancialView';
import { DocumentManagerView } from './components/DocumentManagerView';
import { ScenarioSimulatorView } from './components/scenarios/ScenarioSimulatorView';
import { InvestigationModal } from './components/InvestigationModal';
import { ProfileModal } from './components/ProfileModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App Data State
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [profile, setProfile] = useState<HouseholdProfile | null>(null);

  const [expenses, setExpenses] = useState<HouseholdExpense[]>([]);
  const [assets, setAssets] = useState<HomeAsset[]>([]);
  const [insights, setInsights] = useState<HouseholdInsight[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [investigatingInsight, setInvestigatingInsight] = useState<HouseholdInsight | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  // Fetch initial household data once user logs in
  const loadHouseholdData = useCallback(async () => {
    if (!auth.currentUser) return;
    setIsLoadingData(true);
    setIsLoadingInsights(true);
    try {
      const [profileData, expensesData, assetsData, insightsData] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getExpenses().catch(() => []),
        api.getAssets().catch(() => []),
        api.getInsights().catch(() => []),
      ]);

      if (profileData) setProfile(profileData);
      if (expensesData) setExpenses(expensesData);
      if (assetsData) setAssets(assetsData);
      if (insightsData) setInsights(insightsData);
    } catch (err: any) {
      console.error('Failed to load household data:', err);
      addToast('error', 'Sync Warning', 'Could not load all household data from cloud.');
    } finally {
      setIsLoadingData(false);
      setIsLoadingInsights(false);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
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
      addToast('success', 'Welcome to HouseMind', 'Successfully signed in.');
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
        'Demo Data Populated',
        `Seeded ${result.expensesCount} expenses and ${result.assetsCount} home assets.`
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
    // Automatically mark as viewed if it was new
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
      addToast(
        'success',
        'Status Updated',
        `Insight marked as ${status}.`
      );
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
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onSeedDemo={handleSeedDemo}
        onSignOut={handleSignOut}
        isSeeding={isSeeding}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {activeTab === 'documents' && (
          <DocumentManagerView
            token={authToken}
            profile={profile}
            onShowToast={(msg, type) =>
              addToast(type || 'info', type === 'error' ? 'Document Alert' : 'Document Processed', msg)
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
      </main>


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
      />


      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
