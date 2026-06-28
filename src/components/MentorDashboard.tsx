import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Users, 
  MessageSquare, 
  Award, 
  User, 
  Plus, 
  Check, 
  X, 
  Star, 
  Send, 
  Paperclip, 
  MapPin, 
  Clock, 
  Activity, 
  Terminal, 
  ShieldCheck, 
  BarChart2, 
  ExternalLink 
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { sendMessage, subscribeToMessages, rateProjectAndIssueCertificate } from '../firebase/services';
import { MessageDoc, ProjectDoc, GroupDoc } from '../types';

export default function MentorDashboard() {
  const { 
    user, 
    logout, 
    groups, 
    projects, 
    refreshData,
    notifications 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'projects' | 'chat'>('home');
  const [activeProject, setActiveProject] = useState<ProjectDoc | null>(null);
  const [activeRating, setActiveRating] = useState<number>(10);
  const [reviewComments, setReviewComments] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Group chat states
  const [chatMessages, setChatMessages] = useState<MessageDoc[]>([]);
  const [messageText, setMessageText] = useState('');

  // Handle subscribe to group messages
  useEffect(() => {
    if (groups.length === 0) return;
    // Subscribe to first group's general chat for demonstration
    const unsub = subscribeToMessages(groups[0].id, (msgs) => {
      setChatMessages(msgs);
    });
    return unsub;
  }, [groups]);

  // Handle review submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setIsSubmittingReview(true);
    try {
      await rateProjectAndIssueCertificate(activeProject.id, activeRating, reviewComments);
      await refreshData();
      setActiveProject(null);
      setReviewComments('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user || groups.length === 0) return;
    try {
      await sendMessage(groups[0].id, user.uid, user.name, messageText);
      setMessageText('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-gray-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#111827] border-r border-gray-800 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 pt-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#EC4899] flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">Internship</h1>
              <p className="text-[10px] text-gray-400">Mentor Dashboard</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'home' ? 'bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'students' ? 'bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Assigned Groups
              {groups.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-[#818CF8]">{groups.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'projects' ? 'bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Activity className="w-4 h-4" /> Projects
              {projects.filter(p => p.status === 'submitted').length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-[#f472b6]">{projects.filter(p => p.status === 'submitted').length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <MessageSquare className="w-4 h-4" /> Group Chat
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <img src={user?.profile?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600" alt="" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">Senior Mentor</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Navbar */}
        <header className="sticky top-0 z-20 bg-[#0B1120]/80 backdrop-blur-xl border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Mentor Terminal</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Welcome, {user?.name}</p>
          </div>

          {/* Mobile Selector */}
          <div className="md:hidden flex items-center gap-2">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-white/5 border border-white/10 text-xs px-3 py-1.5 rounded-xl text-white outline-none"
            >
              <option value="home">Dashboard</option>
              <option value="students">Assigned Groups</option>
              <option value="projects">Active Projects</option>
              <option value="chat">Group Chat</option>
            </select>
            <button onClick={logout} className="p-1.5 text-red-400 text-xs font-semibold">Logout</button>
          </div>
        </header>

        {/* Views Content */}
        <div className="p-6 space-y-8 flex-1">
          
          {/* ==================== 1. HOME TAB ==================== */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#4F46E5]/20 via-[#EC4899]/10 to-transparent border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-[#EC4899] font-semibold">Mentor Access</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">Mentor Command Center 👨‍🏫</h3>
                  <p className="text-sm text-gray-400 mt-1">Directly view and review projects assigned to your student cohorts.</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Assigned Groups</span>
                  <p className="text-3xl font-extrabold mt-1">{groups.length}</p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Submissions Pending</span>
                  <p className="text-3xl font-extrabold mt-1 text-pink-400">
                    {projects.filter(p => p.status === 'submitted').length}
                  </p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Graded Projects</span>
                  <p className="text-3xl font-extrabold mt-1 text-emerald-400">
                    {projects.filter(p => p.status === 'reviewed').length}
                  </p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Assigned Interns</span>
                  <p className="text-3xl font-extrabold mt-1 text-indigo-400">
                    {groups.reduce((acc, curr) => acc + curr.studentIds.length, 0)}
                  </p>
                </div>
              </div>

              {/* Active reviews and tables */}
              <div className="grid lg:grid-cols-3 gap-6">
                
                {/* Pending submissions checklist */}
                <div className="lg:col-span-2 bg-[#111827] border border-white/10 rounded-3xl p-6">
                  <h3 className="text-base font-bold mb-4">Milestones Pending Evaluation</h3>
                  <div className="space-y-4">
                    {projects.filter(p => p.status === 'submitted').map((proj, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                          <h4 className="font-semibold text-sm text-white">{proj.title}</h4>
                          <p className="text-xs text-gray-400 mt-1 leading-normal">Submitted solution notes: {proj.submissionText}</p>
                          <div className="flex gap-2 mt-2">
                            <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1">
                              <Terminal className="w-3 h-3" /> GitHub Repo
                            </a>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setActiveProject(proj);
                            setActiveRating(10);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white font-semibold text-xs rounded-xl self-start sm:self-center"
                        >
                          Grade Work
                        </button>
                      </div>
                    ))}

                    {projects.filter(p => p.status === 'submitted').length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-12">No pending project solutions submitted.</p>
                    )}
                  </div>
                </div>

                {/* Performance snapshot */}
                <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
                  <h3 className="text-base font-bold mb-4">Cohort Performance Overview</h3>
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="flex justify-between mb-1"><span>Average Rating</span><span className="font-bold">9.2/10</span></div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span>Milestones Met</span><span className="font-bold">85%</span></div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#EC4899]" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Evaluation Form Popup Overlay */}
              {activeProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-[#1F2937] border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-lg text-white">Evaluate Work: {activeProject.title}</h4>
                      <button onClick={() => setActiveProject(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <form onSubmit={handleReviewSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 block">Rating (out of 10)</label>
                        <div className="flex gap-1 justify-center">
                          {[1,2,3,4,5,6,7,8,9,10].map((star) => (
                            <button 
                              key={star}
                              type="button"
                              onClick={() => setActiveRating(star)}
                              className="text-lg transition-transform hover:scale-125"
                            >
                              <Star className={`w-5 h-5 ${star <= activeRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-400">Review Feedback / Comments</label>
                        <textarea 
                          rows={3}
                          placeholder="Provide constructive feedback, praise, and any follow up actions..."
                          required
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white resize-none"
                        />
                      </div>

                      <div className="p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-xl text-[11px] text-yellow-400 font-semibold leading-normal">
                        ★ This will automatically generate a dynamic verifiable PDF certificate of achievement for the student.
                      </div>

                      <button 
                        type="submit"
                        disabled={isSubmittingReview}
                        className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 font-bold text-sm rounded-xl"
                      >
                        {isSubmittingReview ? "Grading & Generating Certificate..." : "Grade & Award Certificate"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==================== 2. ASSIGNED GROUPS TAB ==================== */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight">My Assigned Cohorts</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {groups.map((g, idx) => (
                  <div key={idx} className="bg-[#111827] border border-white/10 rounded-3xl p-6 relative">
                    <span className="absolute top-6 right-6 text-xs bg-indigo-500/20 text-[#818CF8] px-2.5 py-1 rounded-full font-bold">
                      {g.studentIds.length} Cohort Students
                    </span>
                    <h4 className="font-bold text-lg text-white mb-2">{g.name}</h4>
                    <p className="text-xs text-gray-400 mb-6">Cohort Mentor: {g.mentorName}</p>
                    
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <p className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">Assigned Task / Project</p>
                      <p className="text-sm font-semibold text-white">{g.projectTitle || "No project assigned yet."}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 3. CHAT TAB ==================== */}
          {activeTab === 'chat' && (
            <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#EC4899] flex items-center justify-center font-extrabold text-white">GA</div>
                  <div>
                    <h4 className="font-bold text-sm">Group Alpha (General Chat)</h4>
                    <p className="text-xs text-emerald-400">All students of Cohort Alpha</p>
                  </div>
                </div>
              </div>

              {/* Chat stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-end">
                {chatMessages.map((msg, i) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <div key={i} className={`flex gap-3 max-w-xs ${isMe ? 'self-end flex-row-reverse text-right' : 'self-start'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center font-bold text-white text-xs">
                          {msg.senderName[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] text-gray-500 mb-1">{msg.senderName}</div>
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/5 rounded-tl-none text-gray-300'}`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Type a message to Group Alpha..." 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white"
                />
                <button type="submit" className="p-2.5 rounded-xl bg-indigo-600 text-white"><Send className="w-4 h-4" /></button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
