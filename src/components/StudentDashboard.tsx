import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search, 
  FileText, 
  MessageSquare, 
  Award, 
  User, 
  Settings, 
  Signpost, 
  Bell, 
  Send, 
  Paperclip, 
  Smile, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Clock, 
  Heart, 
  ChevronRight, 
  ExternalLink, 
  Upload, 
  Plus, 
  Check, 
  X, 
  Star,
  Activity,
  Briefcase,
  Camera,
  Loader2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { 
  applyForInternship, 
  toggleBookmark, 
  sendMessage, 
  subscribeToMessages, 
  submitProject, 
  uploadFileToStorage,
  updateApplicationStatus,
  getGroupForStudent,
  updateUserProfile
} from '../firebase/services';
import { MessageDoc, Internship, Application, ProjectDoc } from '../types';

export default function StudentDashboard() {
  const { 
    user, 
    logout, 
    internships, 
    applications, 
    notifications, 
    projects, 
    certificates, 
    refreshData 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'applications' | 'chat' | 'certificates' | 'profile'>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  
  // Application Form States
  const [applyingInternship, setApplyingInternship] = useState<Internship | null>(null);
  const [appFormName, setAppFormName] = useState(user?.name || '');
  const [appFormEmail, setAppFormEmail] = useState(user?.email || '');
  const [appFormCoverLetter, setAppFormCoverLetter] = useState('');
  const [appFormResume, setAppFormResume] = useState<File | null>(null);
  const [appFormCV, setAppFormCV] = useState<File | null>(null);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);

  // Chat States
  const [chatMessages, setChatMessages] = useState<MessageDoc[]>([]);
  const [messageText, setMessageText] = useState('');
  const [activeChatId, setActiveChatId] = useState<string>('group_alpha_uid'); // Mapped to seeded group alpha

  // Profile States
  const [profilePhoto, setProfilePhoto] = useState(user?.profile?.photoUrl || '');
  const [education, setEducation] = useState(user?.profile?.education || '');
  const [skills, setSkills] = useState(user?.profile?.skills?.join(', ') || '');
  const [resumeUrl, setResumeUrl] = useState(user?.profile?.resumeUrl || '');
  const [linkedin, setLinkedin] = useState(user?.profile?.linkedin || '');
  const [github, setGithub] = useState(user?.profile?.github || '');
  const [portfolio, setPortfolio] = useState(user?.profile?.portfolio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Synchronize profile states when user profile details are loaded or updated
  useEffect(() => {
    if (user?.profile) {
      setProfilePhoto(user.profile.photoUrl || '');
      setEducation(user.profile.education || '');
      setSkills(user.profile.skills?.join(', ') || '');
      setResumeUrl(user.profile.resumeUrl || '');
      setLinkedin(user.profile.linkedin || '');
      setGithub(user.profile.github || '');
      setPortfolio(user.profile.portfolio || '');
    }
  }, [user]);

  // Profile Image Upload states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [dragActivePhoto, setDragActivePhoto] = useState(false);

  // Drag and drop handlers for profile photo
  const handleDragPhoto = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActivePhoto(true);
    } else if (e.type === "dragleave") {
      setDragActivePhoto(false);
    }
  };

  const handleDropPhoto = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePhoto(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handlePhotoChange(e.dataTransfer.files[0]);
    }
  };

  const handlePhotoChange = async (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, etc.)');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // 1. Process and compress the image to max 128x128 using HTML canvas to create a lightweight, high-quality circular avatar
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 128;
            const MAX_HEIGHT = 128;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8)); // 0.8 quality jpeg is super lightweight
            } else {
              resolve(event.target?.result as string);
            }
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // 2. Set the state immediately for responsive instant feedback
      setProfilePhoto(compressedBase64);

      // 3. Attempt a real Firebase Storage upload with a 3-second timeout
      try {
        const uploadPromise = uploadFileToStorage(file, `user_profiles/${user?.uid || 'temp'}`);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        const realUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (realUrl) {
          setProfilePhoto(realUrl);
        }
      } catch (storageErr) {
        console.warn("Storage upload timed out or failed. Falling back to robust compressed base64 data URL:", storageErr);
      }

    } catch (err) {
      console.error("Error processing profile image:", err);
      alert("Failed to process image.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Project Submission States
  const [submittingProject, setSubmittingProject] = useState<ProjectDoc | null>(null);
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [reportUrlInput, setReportUrlInput] = useState('');
  const [submissionText, setSubmissionText] = useState('');

  // Load student's actual assigned group for chat
  useEffect(() => {
    if (!user) return;
    const fetchStudentGroup = async () => {
      try {
        const group = await getGroupForStudent(user.uid);
        if (group) {
          setActiveChatId(group.id);
        }
      } catch (err) {
        console.error("Error fetching student group:", err);
      }
    };
    fetchStudentGroup();
  }, [user]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (activeTab === 'chat' && activeChatId) {
      const unsub = subscribeToMessages(activeChatId, (msgs) => {
        setChatMessages(msgs);
      });
      return unsub;
    }
  }, [activeTab, activeChatId]);

  // Send real-time chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;
    try {
      await sendMessage(activeChatId, user.uid, user.name, messageText);
      setMessageText('');
    } catch (err) {
      console.error(err);
    }
  };

  // Bookmark toggler
  const handleBookmarkToggle = async (internshipId: string) => {
    if (!user) return;
    const isBookmarked = user.bookmarkedInternships?.includes(internshipId);
    try {
      await toggleBookmark(user.uid, internshipId, !!isBookmarked);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open application form
  const handleApplyClick = (internship: Internship) => {
    setApplyingInternship(internship);
    setSelectedInternship(null);
    if (user) {
      setAppFormName(user.name || '');
      setAppFormEmail(user.email || '');
      setAppFormCoverLetter('');
      setAppFormResume(null);
      setAppFormCV(null);
    }
  };

  // Submit Application Form
  const submitApplicationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !applyingInternship) return;
    
    setIsSubmittingApp(true);
    try {
      let finalResumeUrl = user.profile?.resumeUrl || "https://example.com/demo-resume.pdf";
      let finalCVUrl = "";
      
      if (appFormResume) {
        finalResumeUrl = await uploadFileToStorage(appFormResume, `resumes/${user.uid}`);
      }
      if (appFormCV) {
        finalCVUrl = await uploadFileToStorage(appFormCV, `cvs/${user.uid}`);
      }

      await applyForInternship({
        internshipId: applyingInternship.id,
        internshipTitle: applyingInternship.title,
        company: applyingInternship.company,
        internId: user.uid,
        internName: appFormName,
        internEmail: appFormEmail,
        resumeUrl: finalResumeUrl,
        cvUrl: finalCVUrl,
        coverLetterText: appFormCoverLetter
      });
      await refreshData();
      setApplyingInternship(null);
    } catch (err) {
      console.error(err);
      alert("Failed to submit application");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  // Submit Project Solution
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingProject) return;
    try {
      await submitProject(submittingProject.id, githubUrlInput, reportUrlInput, submissionText);
      await refreshData();
      setSubmittingProject(null);
      setGithubUrlInput('');
      setReportUrlInput('');
      setSubmissionText('');
    } catch (err) {
      console.error(err);
    }
  };

  // Save profile changes to Firebase Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const parsedSkills = skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
        
      await updateUserProfile(user.uid, {
        photoUrl: profilePhoto || '',
        education: education || '',
        skills: parsedSkills,
        linkedin: linkedin || '',
        github: github || '',
        portfolio: portfolio || '',
        resumeUrl: resumeUrl || ''
      });
      
      await refreshData();
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const filteredInternships = internships.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' ? true : item.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-gray-100 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-[260px] bg-[#111827] border-r border-gray-800 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 pt-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">Internship</h1>
              <p className="text-[10px] text-gray-400">Student Dashboard</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'home' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Home className="w-4 h-4" /> Home
            </button>
            <button 
              onClick={() => setActiveTab('browse')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'browse' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Search className="w-4 h-4" /> Browse Internships
            </button>
            <button 
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'applications' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText className="w-4 h-4" /> My Applications
              {applications.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-[#818CF8]">{applications.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <MessageSquare className="w-4 h-4" /> Chat with Mentor
            </button>
            <button 
              onClick={() => setActiveTab('certificates')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'certificates' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Award className="w-4 h-4" /> Certificates
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-[#4F46E5] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <User className="w-4 h-4" /> My Profile
            </button>
          </nav>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <img src={user?.profile?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600" alt={user?.name} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">{user?.email}</p>
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
        
        {/* Header Navbar */}
        <header className="sticky top-0 z-20 bg-[#0B1120]/80 backdrop-blur-xl border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Student Dashboard</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Logged in as {user?.name}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Notifications Bell */}
            <div className="relative">
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition relative"
              >
                <Bell className="w-4 h-4 text-gray-300" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-14 w-80 bg-[#1F2937] border border-gray-700 rounded-2xl p-4 shadow-2xl z-50 space-y-3"
                  >
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                      <span className="text-xs font-bold text-gray-300">Live Alerts</span>
                      <span className="text-[10px] text-indigo-400 cursor-pointer hover:underline">Mark all read</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length > 0 ? (
                        notifications.map((n, i) => (
                          <div key={i} className="p-2 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300">
                            <p className="font-semibold text-white">{n.title}</p>
                            <p className="mt-1 leading-normal text-gray-400">{n.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-gray-500 text-center py-4">No notifications yet.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Sidebar Link Switcher */}
            <div className="md:hidden flex items-center gap-2">
              <select 
                value={activeTab} 
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="bg-white/5 border border-white/10 text-xs px-3 py-1.5 rounded-xl text-white outline-none"
              >
                <option value="home" className="bg-[#111827]">Home</option>
                <option value="browse" className="bg-[#111827]">Browse</option>
                <option value="applications" className="bg-[#111827]">Applications</option>
                <option value="chat" className="bg-[#111827]">Chat</option>
                <option value="certificates" className="bg-[#111827]">Certificates</option>
                <option value="profile" className="bg-[#111827]">Profile</option>
              </select>
              <button onClick={logout} className="p-1.5 text-red-400 text-xs font-semibold">Logout</button>
            </div>
          </div>
        </header>

        {/* Dashboard Views Content */}
        <div className="p-6 space-y-8 flex-1">
          
          {/* ==================== 1. HOME TAB ==================== */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              
              {/* Profile completion / recommendation card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4F46E5]/20 via-[#06B6D4]/10 to-transparent border border-white/10 p-6 sm:p-8">
                <div className="relative z-10 max-w-xl">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">Welcome back, {user?.name}! 👋</h3>
                  <p className="text-sm text-gray-400 mb-6">You have {internships.length} active opportunities matching your profile interests.</p>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setActiveTab('browse')}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-semibold text-xs rounded-xl shadow-md"
                    >
                      Browse Internships
                    </button>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="px-5 py-2.5 border border-white/20 hover:bg-white/5 rounded-xl text-xs font-semibold"
                    >
                      Complete Profile
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of Key Actions & Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Submitted Apps</span>
                  <p className="text-3xl font-extrabold mt-1">{applications.length}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Assigned Projects</span>
                  <p className="text-3xl font-extrabold mt-1">{projects.length}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Earned Certs</span>
                  <p className="text-3xl font-extrabold mt-1 text-[#10B981]">{certificates.length}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Group Code</span>
                  <p className="text-xl font-bold mt-2 text-indigo-400">Group Alpha</p>
                </div>
              </div>

              {/* Active Assigned Projects and submissions */}
              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* Project Milestone Evaluator */}
                <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
                  <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-pink-400" /> Assigned Projects & Milestones
                  </h3>
                  {projects.length > 0 ? (
                    <div className="space-y-4">
                      {projects.map((proj, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 relative">
                          <span className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${proj.status === 'reviewed' ? 'bg-emerald-500/15 text-emerald-400' : proj.status === 'submitted' ? 'bg-blue-500/15 text-blue-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {proj.status}
                          </span>
                          <h4 className="font-semibold text-sm text-white pr-16">{proj.title}</h4>
                          <p className="text-xs text-gray-400 mt-1 leading-normal mb-3">{proj.description}</p>
                          
                          {proj.status === 'assigned' && (
                            <button 
                              onClick={() => setSubmittingProject(proj)}
                              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1"
                            >
                              <Upload className="w-3.5 h-3.5" /> Submit Work / Solution
                            </button>
                          )}

                          {proj.status === 'reviewed' && (
                            <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-300">
                              <p className="font-semibold text-white">Review Feedback</p>
                              <p className="mt-1">Rating: <span className="font-bold text-yellow-400">{proj.rating}/10</span></p>
                              <p className="mt-1 leading-normal text-gray-400">{proj.reviewComments}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                      <p className="text-xs">No assigned projects yet. Wait for Admin/Mentor grouping.</p>
                    </div>
                  )}
                </div>

                {/* Submissions form popup overlay if active */}
                {submittingProject && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#1F2937] border border-gray-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-lg text-white">Submit solution for: {submittingProject.title}</h4>
                        <button onClick={() => setSubmittingProject(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                      </div>
                      <form onSubmit={handleProjectSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-400">Github Repository URL</label>
                          <input 
                            type="url" 
                            placeholder="https://github.com/..." 
                            required
                            value={githubUrlInput}
                            onChange={(e) => setGithubUrlInput(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-400">Project Demo Video or Report URL</label>
                          <input 
                            type="url" 
                            placeholder="https://..." 
                            value={reportUrlInput}
                            onChange={(e) => setReportUrlInput(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-400">Submission Text / Notes</label>
                          <textarea 
                            rows={3} 
                            placeholder="Describe your implementation features, tech stack, and setup instructions..." 
                            required
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white resize-none"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold text-sm rounded-xl"
                        >
                          Submit Solution
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Applications status tracker timeline */}
                <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
                  <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" /> Active Application Timeline
                  </h3>
                  {applications.length > 0 ? (
                    <div className="space-y-4">
                      {applications.map((app, idx) => (
                        <div key={idx} className="flex gap-4 items-start p-3 bg-white/5 rounded-xl">
                          <span className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${app.status === 'approved' ? 'bg-[#10B981] animate-pulse' : app.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{app.internshipTitle}</p>
                            <p className="text-xs text-gray-400">{app.company} • Status: <span className="font-bold text-gray-300 uppercase">{app.status}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                      <p className="text-xs">No active applications yet.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ==================== 2. BROWSE TAB ==================== */}
          {activeTab === 'browse' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Browse Internships</h3>
                  <p className="text-xs text-gray-400">Search and apply to positions direct via Firestore</p>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Search roles or companies..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                  />
                  <select 
                    value={deptFilter} 
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="All" className="bg-[#111827]">All Depts</option>
                    <option value="Information Technology" className="bg-[#111827]">IT</option>
                    <option value="Engineering" className="bg-[#111827]">Engineering</option>
                    <option value="Business & Finance" className="bg-[#111827]">Finance</option>
                    <option value="Marketing" className="bg-[#111827]">Marketing</option>
                  </select>
                </div>
              </div>

              {/* Grid of Internships */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInternships.map((item, idx) => (
                  <div key={idx} className="bg-[#111827] border border-white/10 rounded-3xl p-6 hover:border-indigo-500/30 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center">
                          <img src={item.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${item.company}`} className="w-full h-full object-contain rounded-lg" alt={item.company} />
                        </div>
                        <button 
                          onClick={() => handleBookmarkToggle(item.id)}
                          className="p-2 rounded-xl bg-white/5 border border-white/10 text-pink-400 hover:bg-white/10"
                        >
                          <Heart className={`w-3.5 h-3.5 ${user?.bookmarkedInternships?.includes(item.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
                        </button>
                      </div>

                      <h4 className="font-semibold text-base mb-1 leading-snug">{item.title}</h4>
                      <p className="text-xs text-gray-400 mb-3">{item.company} • {item.location}</p>
                      <p className="text-xs text-gray-300 leading-normal line-clamp-3 mb-4">{item.description}</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wider">STIPEND</p>
                        <p className="font-bold text-emerald-400">{item.stipend}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedInternship(item)}
                        className="px-3.5 py-1.5 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold"
                      >
                        Apply / View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Internship View Detail Popup Modal */}
              {selectedInternship && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-[#1F2937] border border-gray-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center">
                          <img src={selectedInternship.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedInternship.company}`} className="w-10 h-10 object-contain rounded" alt="" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-white">{selectedInternship.title}</h4>
                          <p className="text-xs text-gray-400">{selectedInternship.company} • {selectedInternship.location}</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedInternship(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div>
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Position Description</h5>
                        <p className="text-sm text-gray-300 leading-relaxed">{selectedInternship.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-400" />
                          <div>
                            <p className="text-[10px] text-gray-400">Duration</p>
                            <p className="text-xs font-semibold">{selectedInternship.duration}</p>
                          </div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-[10px] text-gray-400">Stipend</p>
                            <p className="text-xs font-semibold">{selectedInternship.stipend}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setSelectedInternship(null)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/5">Cancel</button>
                      <button 
                        onClick={() => handleApplyClick(selectedInternship)}
                        className="flex-1 py-3 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-semibold text-xs rounded-xl"
                      >
                        Confirm Application
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Application Form Modal */}
              {applyingInternship && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
                      <div>
                        <h4 className="text-lg font-bold tracking-tight">Apply for Position</h4>
                        <p className="text-xs text-gray-400">{applyingInternship.title} at {applyingInternship.company}</p>
                      </div>
                      <button onClick={() => setApplyingInternship(null)} className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                      <form id="apply-form" onSubmit={submitApplicationForm} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-400">Full Name</label>
                          <input 
                            required
                            type="text" 
                            value={appFormName} 
                            onChange={(e) => setAppFormName(e.target.value)}
                            placeholder="Your full name" 
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-400">Email Address</label>
                          <input 
                            required
                            type="email" 
                            value={appFormEmail} 
                            onChange={(e) => setAppFormEmail(e.target.value)}
                            placeholder="Your email address" 
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-400">Cover Letter</label>
                          <textarea 
                            rows={4}
                            value={appFormCoverLetter} 
                            onChange={(e) => setAppFormCoverLetter(e.target.value)}
                            placeholder="Why are you a good fit for this position?" 
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white resize-none"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400">Resume Upload (Optional)</label>
                            <input 
                              type="file" 
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setAppFormResume(e.target.files[0]);
                                }
                              }}
                              className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4F46E5] file:text-white hover:file:bg-[#6366F1] cursor-pointer"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">If not provided, profile resume will be used.</p>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-400">CV Upload (Optional)</label>
                            <input 
                              type="file" 
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setAppFormCV(e.target.files[0]);
                                }
                              }}
                              className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4F46E5] file:text-white hover:file:bg-[#6366F1] cursor-pointer"
                            />
                          </div>
                        </div>
                      </form>
                    </div>

                    <div className="p-6 border-t border-white/10 shrink-0 flex gap-2">
                      <button onClick={() => setApplyingInternship(null)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/5">Cancel</button>
                      <button 
                        type="submit"
                        form="apply-form"
                        disabled={isSubmittingApp}
                        className="flex-1 py-3 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
                      >
                        {isSubmittingApp && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                        {isSubmittingApp ? 'Submitting...' : 'Submit Application'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== 3. MY APPLICATIONS TAB ==================== */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight">My Submitted Applications</h3>
                <p className="text-xs text-gray-400">Track and review positions you have applied for</p>
              </div>

              <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-black/30 text-xs text-gray-400 uppercase border-b border-white/10">
                    <tr>
                      <th className="py-4 px-6">Position</th>
                      <th className="py-4 px-6">Company</th>
                      <th className="py-4 px-6">Provided Documents</th>
                      <th className="py-4 px-6">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {applications.map((app, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-4 px-6 font-semibold text-white">{app.internshipTitle}</td>
                        <td className="py-4 px-6 text-gray-300">{app.company}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            {app.resumeUrl && (
                              <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline cursor-pointer text-xs flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Resume
                              </a>
                            )}
                            {app.cvUrl && (
                              <a href={app.cvUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline cursor-pointer text-xs flex items-center gap-1">
                                <FileText className="w-3 h-3" /> CV
                              </a>
                            )}
                            {!app.resumeUrl && !app.cvUrl && <span className="text-xs text-gray-500">None provided</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase ${app.status === 'approved' ? 'bg-[#10B981]/15 text-[#818CF8]' : app.status === 'rejected' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 4. CHAT TAB ==================== */}
          {activeTab === 'chat' && (
            <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center font-extrabold text-white">GA</div>
                  <div>
                    <h4 className="font-bold text-sm">Group Alpha (General Chat)</h4>
                    <p className="text-xs text-emerald-400">Dr. Sarah Mitchell (Mentor) Online</p>
                  </div>
                </div>
              </div>

              {/* Chat messages stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-end">
                {chatMessages.map((msg, i) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <div key={i} className={`flex gap-3 max-w-xs ${isMe ? 'self-end flex-row-reverse text-right' : 'self-start'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">
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

          {/* ==================== 5. CERTIFICATES TAB ==================== */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight">My Achievement Credentials</h3>
                <p className="text-xs text-gray-400">View and download your digital completion certificates</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {certificates.map((cert, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-[#1F2937] to-[#111827] border-2 border-yellow-400/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-bl-full pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                        <Award className="w-6 h-6 text-yellow-400 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-white">Certificate of Achievement</h4>
                        <p className="text-xs text-gray-400">{cert.internshipTitle}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-6 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Awarded to:</span>
                        <span className="font-semibold text-white">{cert.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Company Name:</span>
                        <span className="font-semibold text-white">{cert.company}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Assigned Mentor:</span>
                        <span className="font-semibold text-white">{cert.mentorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Project Evaluation:</span>
                        <span className="font-semibold text-yellow-400">{cert.rating}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Credential ID:</span>
                        <span className="font-mono text-indigo-400">{cert.certificateId}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Issued: {cert.issueDate}</span>
                      <a 
                        href={cert.pdfUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 font-bold text-xs rounded-xl hover:opacity-90"
                      >
                        Download PDF Certificate
                      </a>
                    </div>
                  </div>
                ))}

                {certificates.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 bg-[#111827] rounded-3xl border border-dashed border-white/10">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-xs">No certificates generated yet. Complete assigned project tasks to get evaluated.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 6. PROFILE TAB ==================== */}
          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto bg-[#111827] border border-white/10 rounded-3xl p-6 sm:p-8">
              <h3 className="text-xl font-bold tracking-tight mb-6">Manage Profile</h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                
                {/* Circular Profile Photo Upload Box */}
                <div className="flex flex-col items-center justify-center pb-4 border-b border-white/5 mb-4">
                  <span className="text-xs font-semibold text-gray-400 mb-2">Profile Photo</span>
                  <div 
                    onDragEnter={handleDragPhoto}
                    onDragOver={handleDragPhoto}
                    onDragLeave={handleDragPhoto}
                    onDrop={handleDropPhoto}
                    onClick={() => document.getElementById('profile-photo-file-input')?.click()}
                    className={`relative w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-white/5 transition-all group ${
                      dragActivePhoto ? 'border-[#4F46E5] bg-[#4F46E5]/10 scale-105' : 'border-white/20 hover:border-[#4F46E5]/60'
                    }`}
                  >
                    {profilePhoto ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={profilePhoto} 
                          alt="Profile Preview" 
                          className="w-full h-full object-cover rounded-full"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-medium transition-opacity rounded-full">
                          <Camera className="w-4 h-4 mb-1 text-white" />
                          Change
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400 group-hover:text-white transition-colors">
                        {isUploadingPhoto ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#4F46E5]" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mb-1 opacity-60 group-hover:opacity-100" />
                            <span className="text-[10px] font-medium">Upload Photo</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {isUploadingPhoto && profilePhoto && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  
                  <input 
                    id="profile-photo-file-input"
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePhotoChange(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                  />
                  
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    Drag and drop or click to upload (PNG, JPG, SVG up to 5MB)
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Education Background</label>
                  <input 
                    type="text" 
                    value={education} 
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g. Stanford University - B.S. Computer Science" 
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Skills (Comma-separated)</label>
                  <input 
                    type="text" 
                    value={skills} 
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. React, TypeScript, Python, Node.js" 
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">LinkedIn URL</label>
                  <input 
                    type="url" 
                    value={linkedin} 
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..." 
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">GitHub Repository URL</label>
                  <input 
                    type="url" 
                    value={github} 
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/..." 
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSavingProfile}
                  className="w-full py-3 bg-[#4F46E5] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                  {isSavingProfile ? "Saving Profile..." : "Save Profile Details"}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
