import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Plus, 
  FileText, 
  Users, 
  Activity, 
  Settings, 
  Download, 
  Bell, 
  Briefcase, 
  Check, 
  X, 
  Mail, 
  Eye, 
  Pause, 
  Play, 
  Trash2, 
  MapPin, 
  Clock, 
  TrendingUp, 
  DollarSign,
  Upload,
  Camera,
  Loader2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { 
  createInternship, 
  updateInternshipStatus, 
  deleteInternship, 
  updateApplicationStatus,
  uploadFileToStorage
} from '../firebase/services';
import { Internship, Application } from '../types';

export default function HRDashboard() {
  const { 
    user, 
    logout, 
    internships, 
    applications, 
    refreshData,
    notifications 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'home' | 'create' | 'posts' | 'applicants'>('home');
  const [notifOpen, setNotifOpen] = useState(false);

  // New Internship states
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('TechNova Labs'); // Default matching HR
  const [newLocation, setNewLocation] = useState('Remote');
  const [newStipend, setNewStipend] = useState('$5,000/mo');
  const [newDuration, setNewDuration] = useState('3 months');
  const [newSeats, setNewSeats] = useState(5);
  const [newDeadline, setNewDeadline] = useState('2026-12-15');
  const [newDept, setNewDept] = useState('Information Technology');
  const [newDesc, setNewDesc] = useState('');
  
  // Circular Image Upload states
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleLogoChange(e.dataTransfer.files[0]);
    }
  };

  const handleLogoChange = async (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, etc.)');
      return;
    }

    setIsUploadingLogo(true);

    try {
      // 1. Process and compress the image to max 128x128 using HTML canvas to create a lightweight, high-quality circular logo
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

      // 2. Set both the preview and logoUrl immediately so it is instantly available and responsive
      setLogoPreview(compressedBase64);
      setLogoUrl(compressedBase64);

      // 3. Attempt a real Firebase Storage upload with a 3-second timeout.
      // This ensures that even if storage hangs or fails, the user is never blocked!
      try {
        const uploadPromise = uploadFileToStorage(file, 'internship_logos');
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        const realUrl = await Promise.race([uploadPromise, timeoutPromise]);
        if (realUrl) {
          setLogoUrl(realUrl);
        }
      } catch (storageErr) {
        console.warn("Storage upload timed out or failed. Falling back to robust compressed base64 data URL:", storageErr);
      }

    } catch (err) {
      console.error("Error processing logo image:", err);
      alert("Failed to process image.");
    } finally {
      setIsUploadingLogo(false);
    }
  };
  
  // Statuses
  const [isPosting, setIsPosting] = useState(false);

  // Handle post internship
  const handlePostInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;
    setIsPosting(true);
    try {
      await createInternship({
        title: newTitle,
        company: newCompany,
        logoUrl: logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newCompany)}`,
        description: newDesc,
        department: newDept,
        duration: newDuration,
        seats: Number(newSeats),
        deadline: newDeadline,
        stipend: newStipend,
        location: newLocation,
        postedBy: user?.uid || '',
        status: 'active'
      });
      await refreshData();
      setActiveTab('posts');
      // Reset
      setNewTitle('');
      setNewDesc('');
      setLogoUrl('');
      setLogoPreview('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  // Toggle Pause/Play status
  const handleToggleStatus = async (id: string, currentStatus: 'active' | 'paused') => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await updateInternshipStatus(id, nextStatus);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete posting
  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this internship?")) return;
    try {
      await deleteInternship(id);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Approve / Reject Application
  const handleApplicationReview = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      await updateApplicationStatus(appId, status);
      await refreshData();
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] via-[#4F46E5] to-[#2563EB] flex items-center justify-center shadow-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">Internship</h1>
              <p className="text-[10px] text-gray-400">HR Admin Panel</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'home' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('create')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Plus className="w-4 h-4" /> Create Internship
            </button>
            <button 
              onClick={() => setActiveTab('posts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'posts' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText className="w-4 h-4" /> My Posts
              {internships.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-[#818CF8]">{internships.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('applicants')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'applicants' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Applicants
              {applications.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-[#f472b6]">{applications.length}</span>
              )}
            </button>
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <img src={user?.profile?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600" alt="" />
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
        
        {/* Navbar */}
        <header className="sticky top-0 z-20 bg-[#0B1120]/80 backdrop-blur-xl border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">HR Control Center</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Manage and publish internships safely</p>
          </div>

          <div className="flex items-center gap-4">
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

            {/* Mobile View Switcher */}
            <div className="md:hidden flex items-center gap-2">
              <select 
                value={activeTab} 
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="bg-white/5 border border-white/10 text-xs px-3 py-1.5 rounded-xl text-white outline-none"
              >
                <option value="home">Dashboard</option>
                <option value="create">Post Internship</option>
                <option value="posts">My Posts</option>
                <option value="applicants">Applicants</option>
              </select>
              <button onClick={logout} className="p-1.5 text-red-400 text-xs font-semibold">Logout</button>
            </div>
          </div>
        </header>

        {/* Dashboard Tabs Content */}
        <div className="p-6 space-y-8 flex-1">
          
          {/* ==================== 1. HOME TAB ==================== */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              
              {/* Profile welcome */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-violet-600/20 via-indigo-600/10 to-transparent border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">HR Dashboard</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 text-white">Welcome, {user?.name} 👋</h3>
                  <p className="text-sm text-gray-400 mt-1">Ready to find top candidates for your organization.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('create')}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white font-semibold text-xs rounded-xl shadow-md"
                >
                  Create New Position
                </button>
              </div>

              {/* Metrics cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Listings</span>
                  <p className="text-3xl font-extrabold mt-1">{internships.length}</p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Candidates</span>
                  <p className="text-3xl font-extrabold mt-1">{applications.length}</p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Shortlisted / Selected</span>
                  <p className="text-3xl font-extrabold mt-1 text-emerald-400">
                    {applications.filter(a => a.status === 'approved').length}
                  </p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Review Pending</span>
                  <p className="text-3xl font-extrabold mt-1 text-yellow-500">
                    {applications.filter(a => a.status === 'pending').length}
                  </p>
                </div>
              </div>

              {/* Candidates review snapshot */}
              <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
                <h3 className="text-base font-bold mb-4">Pending Applicants Queue</h3>
                
                <div className="space-y-4">
                  {applications.filter(a => a.status === 'pending').slice(0, 5).map((app, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div>
                        <p className="font-semibold text-sm text-white">{app.internName}</p>
                        <p className="text-xs text-gray-400">{app.internEmail} • Applied for: <span className="font-bold text-gray-300">{app.internshipTitle}</span></p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApplicationReview(app.id, 'approved')}
                          className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl"
                        >
                          Shortlist
                        </button>
                        <button 
                          onClick={() => handleApplicationReview(app.id, 'rejected')}
                          className="px-3.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}

                  {applications.filter(a => a.status === 'pending').length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                      <p className="text-xs">No pending applications in your queue.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ==================== 2. CREATE POST TAB ==================== */}
          {activeTab === 'create' && (
            <div className="max-w-xl mx-auto bg-[#111827] border border-white/10 rounded-3xl p-6 sm:p-8">
              <h3 className="text-xl font-bold tracking-tight mb-6">Create Internship Position</h3>
              
              <form onSubmit={handlePostInternship} className="space-y-4">
                {/* Circular Logo Upload Box */}
                <div className="flex flex-col items-center justify-center pb-4 border-b border-white/5 mb-4">
                  <span className="text-xs font-semibold text-gray-400 mb-2">Company / Internship Circular Image</span>
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('logo-file-input')?.click()}
                    className={`relative w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer bg-white/5 transition-all group ${
                      dragActive ? 'border-[#7C3AED] bg-[#7C3AED]/10 scale-105' : 'border-white/20 hover:border-[#7C3AED]/60'
                    }`}
                  >
                    {logoPreview ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={logoPreview} 
                          alt="Logo Preview" 
                          className="w-full h-full object-cover rounded-full"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-medium transition-opacity rounded-full">
                          <Camera className="w-4 h-4 mb-1 text-white" />
                          Change
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400 group-hover:text-white transition-colors">
                        {isUploadingLogo ? (
                          <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mb-1 opacity-60 group-hover:opacity-100" />
                            <span className="text-[10px] font-medium">Upload Image</span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {isUploadingLogo && logoPreview && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  
                  <input 
                    id="logo-file-input"
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLogoChange(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                  />
                  
                  <p className="text-[10px] text-gray-500 mt-1.5">
                    Drag and drop or click to upload (PNG, JPG, SVG up to 5MB)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Position Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Software Engineering Intern" 
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. TechNova Labs" 
                      required
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Location</label>
                    <input 
                      type="text" 
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Department</label>
                    <select 
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="Information Technology" className="bg-[#111827]">Information Technology</option>
                      <option value="Engineering" className="bg-[#111827]">Engineering</option>
                      <option value="Business & Finance" className="bg-[#111827]">Business & Finance</option>
                      <option value="Marketing" className="bg-[#111827]">Marketing</option>
                      <option value="Human Resources" className="bg-[#111827]">Human Resources</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Stipend</label>
                    <input 
                      type="text" 
                      value={newStipend}
                      onChange={(e) => setNewStipend(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Duration</label>
                    <input 
                      type="text" 
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Open Seats</label>
                    <input 
                      type="number" 
                      value={newSeats}
                      onChange={(e) => setNewSeats(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Full Description</label>
                  <textarea 
                    rows={4} 
                    placeholder="Describe roles, tasks, technologies, and candidate profile requirements..." 
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isPosting}
                  className="w-full py-3.5 bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white font-semibold text-xs rounded-xl shadow-lg"
                >
                  {isPosting ? "Posting Position..." : "Publish Position"}
                </button>
              </form>
            </div>
          )}

          {/* ==================== 3. MY POSTS TAB ==================== */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight">Active Published Positions</h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {internships.map((post, idx) => (
                  <div key={idx} className="bg-[#111827] border border-white/10 rounded-3xl p-5 hover:border-[#7C3AED]/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${post.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-500'}`}>
                          ● {post.status}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleToggleStatus(post.id, post.status)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
                            title={post.status === 'active' ? 'Pause Hiring' : 'Resume Hiring'}
                          >
                            <Pause className="w-3.5 h-3.5 text-yellow-400" />
                          </button>
                          <button 
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 hover:bg-red-500/25"
                            title="Delete Position"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                          <img 
                            src={post.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.company)}`} 
                            className="w-full h-full object-cover" 
                            alt={post.company} 
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-base leading-snug">{post.title}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{post.company}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed mb-4">{post.description}</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-white/5 py-2 rounded-xl">
                        <p className="text-[10px] text-gray-500">Seats</p>
                        <p className="font-bold text-white">{post.seats}</p>
                      </div>
                      <div className="bg-white/5 py-2 rounded-xl">
                        <p className="text-[10px] text-gray-500">Stipend</p>
                        <p className="font-bold text-emerald-400">{post.stipend}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 4. APPLICANTS TAB ==================== */}
          {activeTab === 'applicants' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight">Active Candidate Database</h3>
              
              <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-black/30 text-xs text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-4 px-6">Applicant</th>
                      <th className="py-4 px-6">Applied For</th>
                      <th className="py-4 px-6">Resume Details</th>
                      <th className="py-4 px-6">Decision Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {applications.map((app, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-white">{app.internName}</p>
                          <p className="text-xs text-gray-500">{app.internEmail}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-gray-300">{app.internshipTitle}</p>
                          {app.coverLetterText && (
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic" title={app.coverLetterText}>"{app.coverLetterText}"</p>
                          )}
                        </td>
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
                          <span className={`pill inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${app.status === 'approved' ? 'bg-[#10B981]/15 text-[#818CF8]' : app.status === 'rejected' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {app.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => handleApplicationReview(app.id, 'approved')}
                                className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-semibold"
                              >
                                Shortlist
                              </button>
                              <button 
                                onClick={() => handleApplicationReview(app.id, 'rejected')}
                                className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 text-xs rounded-xl font-semibold"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
