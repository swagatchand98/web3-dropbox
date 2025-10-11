'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LandingPage from '@/components/LandingPage';
import AuthPage from '@/components/AuthPage';
import AuthenticatedDashboard from '@/components/AuthenticatedDashboard';

export default function Home() {
  const { user, profile, loading, error } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Show loading while Firebase initializes
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Show Firebase error if there's a critical error
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-6 backdrop-blur-lg">
            <h2 className="text-xl font-bold text-red-300 mb-4">Authentication Error</h2>
            <p className="text-red-200 mb-4">{error}</p>
            <div className="text-left text-red-200 text-sm space-y-2 mb-4">
              <p>Please check:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Firebase project is properly configured</li>
                <li>Firestore database is enabled</li>
                <li>Authentication providers are set up</li>
                <li>Network connection is stable</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard if user is authenticated and profile is loaded
  if (user && profile) {
    return <AuthenticatedDashboard />;
  }

  // Show authentication page if user clicked get started
  if (showAuth) {
    return <AuthPage onAuthSuccess={() => setShowAuth(false)} onBack={() => setShowAuth(false)} />;
  }

  // Show landing page for unauthenticated users
  return <LandingPage onGetStarted={() => setShowAuth(true)} />;
}
