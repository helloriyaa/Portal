import React from 'react';
import { useApp } from './contexts/AppContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import HRDashboard from './components/HRDashboard';
import MentorDashboard from './components/MentorDashboard';
import AdminDashboard from './components/AdminDashboard';
import { Sparkles, Loader } from 'lucide-react';

export default function App() {
  const { activeTab, setTab, user, loading, logout } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white flex flex-col items-center justify-center">
        <Loader className="w-10 h-10 text-[#4F46E5] animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-semibold uppercase tracking-widest">Loading Portal Database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white select-none">
      
      {/* Global Navbar for Landing Page */}
      {activeTab === 'landing' && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/80 backdrop-blur-lg border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              
              {/* Logo */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTab('landing')}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-display font-bold text-lg tracking-tight">Internship<span className="text-pink-400">Portal</span></span>
                </div>
              </div>

              {/* Actions / Auth Switcher */}
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <button 
                      onClick={() => setTab(user.role === 'admin' ? 'admin' : `${user.role}-dashboard`)}
                      className="text-sm font-semibold text-white/90 hover:text-white"
                    >
                      Go to Dashboard
                    </button>
                    <button 
                      onClick={logout}
                      className="px-4 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setTab('auth-login')}
                      className="text-sm font-semibold text-white/90 hover:text-white"
                    >
                      Log in
                    </button>
                    <button 
                      onClick={() => setTab('auth-register')}
                      className="px-5 py-2 text-xs font-semibold bg-white text-zinc-950 rounded-2xl hover:opacity-90"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        </nav>
      )}

      {/* Render Active View Router */}
      {activeTab === 'landing' && <LandingPage />}
      {(activeTab === 'auth-login' || activeTab === 'auth-register') && <LoginPage />}
      {activeTab === 'intern-dashboard' && <StudentDashboard />}
      {activeTab === 'hr-dashboard' && <HRDashboard />}
      {activeTab === 'mentor-dashboard' && <MentorDashboard />}
      {activeTab === 'admin' && <AdminDashboard />}

    </div>
  );
}
