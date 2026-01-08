'use client';

import { useState, useEffect } from 'react';
import { getSession, signOut } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await getSession();
      
      if (session) {
        // Check if remember me has expired
        const rememberMe = localStorage.getItem('rememberMe');
        const expiry = localStorage.getItem('rememberMeExpiry');
        
        if (rememberMe && expiry) {
          if (Date.now() > parseInt(expiry)) {
            // Remember me expired, sign out
            await signOut();
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={checkAuth} />;
  }

  return <Dashboard onLogout={() => setIsAuthenticated(false)} />;
}
