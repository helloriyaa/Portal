import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Users, 
  UserCheck, 
  Plus, 
  Briefcase, 
  Award, 
  TrendingUp, 
  FileText, 
  X, 
  Check, 
  FolderPlus, 
  BookOpen, 
  ShieldAlert, 
  Settings,
  Bell,
  Trash2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { 
  createUserDoc, 
  createGroupAndAssignMentor, 
  assignProjectToGroup, 
  approveInternshipByAdmin,
  createNotification,
  deleteInternship
} from '../firebase/services';
import { 
  db 
} from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { UserDoc, Internship } from '../types';

export default function AdminDashboard() {
  const { 
    user, 
    logout, 
    internships, 
    applications, 
    groups, 
    certificates, 
    refreshData 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'home' | 'hr-verify' | 'mentor-verify' | 'internships' | 'mentors' | 'groups'>('home');
  const [pendingHRs, setPendingHRs] = useState<UserDoc[]>([]);
  const [pendingMentors, setPendingMentors] = useState<UserDoc[]>([]);
  const [mentors, setMentors] = useState<UserDoc[]>([]);
  const [interns, setInterns] = useState<UserDoc[]>([]);

  // New Mentor Form
  const [mentorName, setMentorName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [mentorPassword, setMentorPassword] = useState('demo1234'); // Default for quick setup
  const [isCreatingMentor, setIsCreatingMentor] = useState(false);

  // New Group Form
  const [groupName, setGroupName] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [showAssembleSuccess, setShowAssembleSuccess] = useState(false);
  const [assembledGroupName, setAssembledGroupName] = useState('');

  // Assign Project Form
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('2026-12-28');
  const [isAssigningProject, setIsAssigningProject] = useState(false);

  // Fetch HR & Users needing approval or directory info
  const fetchUsersData = async () => {
    try {
      const usersRef = collection(db, 'users');
      
      // Fetch Pending HR
      const hrSnap = await getDocs(query(usersRef, where('role', '==', 'hr'), where('approved', '==', false)));
      setPendingHRs(hrSnap.docs.map(doc => doc.data() as UserDoc));

      // Fetch Pending Mentors
      const pendingMentorSnap = await getDocs(query(usersRef, where('role', '==', 'mentor'), where('approved', '==', false)));
      setPendingMentors(pendingMentorSnap.docs.map(doc => doc.data() as UserDoc));

      // Fetch All Approved Mentors
      const mentorSnap = await getDocs(query(usersRef, where('role', '==', 'mentor'), where('approved', '==', true)));
      setMentors(mentorSnap.docs.map(doc => doc.data() as UserDoc));

      // Fetch All Interns
      const internSnap = await getDocs(query(usersRef, where('role', '==', 'intern')));
      setInterns(internSnap.docs.map(doc => doc.data() as UserDoc));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, [activeTab]);

  // Approve HR User
  const handleApproveHR = async (hrUid: string) => {
    try {
      const docRef = doc(db, 'users', hrUid);
      await updateDoc(docRef, { approved: true });
      await createNotification(hrUid, "Account Approved", "Admin has approved your HR Administrator profile.");
      await fetchUsersData();
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Mentor User
  const handleApproveMentor = async (mentorUid: string) => {
    try {
      const docRef = doc(db, 'users', mentorUid);
      await updateDoc(docRef, { approved: true });
      await createNotification(mentorUid, "Account Approved", "Admin has approved your Mentor profile.");
      await fetchUsersData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Mentor Account
  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorName || !mentorEmail) return;
    setIsCreatingMentor(true);
    try {
      const demoUid = `mentor_${Math.random().toString(36).substr(2, 9)}`;
      await createUserDoc(demoUid, mentorName, mentorEmail, 'mentor');
      await fetchUsersData();
      setMentorName('');
      setMentorEmail('');
      alert("Mentor account created and seeded in users database successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingMentor(false);
    }
  };

  // Create Group & Assign Mentor
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !selectedMentorId) return;
    setIsCreatingGroup(true);
    try {
      const mentor = mentors.find(m => m.uid === selectedMentorId);
      await createGroupAndAssignMentor(
        groupName, 
        selectedMentorId, 
        mentor ? mentor.name : 'Mentor', 
        selectedStudentIds
      );
      await refreshData();
      setAssembledGroupName(groupName);
      setGroupName('');
      setSelectedStudentIds([]);
      setShowAssembleSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Assign Project to Group
  const handleAssignProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !projectTitle) return;
    setIsAssigningProject(true);
    try {
      await assignProjectToGroup(
        selectedGroupId, 
        projectTitle, 
        projectDesc, 
        ['React', 'TypeScript', 'Tailwind'], 
        projectDeadline
      );
      await refreshData();
      setProjectTitle('');
      setProjectDesc('');
      alert("Project milestone assigned and students notified!");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssigningProject(false);
    }
  };

  // Approve posted internship
  const handleApproveInternship = async (id: string) => {
    try {
      await approveInternshipByAdmin(id, true);
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete posted internship
  const handleDeleteInternship = async (job: Internship) => {
    try {
      await deleteInternship(job.id);
      if (job.postedBy) {
        await createNotification(job.postedBy, "Job Posting Removed", `Your job posting for ${job.title} has been removed by the admin.`);
      }
      await refreshData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete job posting');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B1120] text-gray-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#111827] border-r border-gray-800 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 pt-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/10">
              <Briefcase className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">Internship</h1>
              <p className="text-[10px] text-yellow-400 font-semibold">Portal Administrator</p>
            </div>
          </div>

          {/* Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'home' ? 'bg-yellow-400 text-zinc-950 shadow-md font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Home className="w-4 h-4" /> Overview Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('hr-verify')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'hr-verify' ? 'bg-yellow-400 text-zinc-950 shadow-md font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <UserCheck className="w-4 h-4" /> Approve HR Profiles
              {pendingHRs.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">{pendingHRs.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('mentor-verify')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'mentor-verify' ? 'bg-yellow-400 text-zinc-950 shadow-md font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <UserCheck className="w-4 h-4" /> Approve Mentor Profiles
              {pendingMentors.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">{pendingMentors.length}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('internships')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'internships' ? 'bg-yellow-400 text-zinc-950 shadow-md font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Briefcase className="w-4 h-4" /> Posted Jobs
            </button>
            <button 
              onClick={() => setActiveTab('mentors')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'mentors' ? 'bg-yellow-400 text-zinc-950 shadow-md font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Plus className="w-4 h-4" /> Manage Mentors
            </button>
            <button 
              onClick={() => setActiveTab('groups')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'groups' ? 'bg-yellow-400 text-zinc-950 shadow-md font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <FolderPlus className="w-4 h-4" /> Groups & Projects
            </button>
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 text-zinc-100 flex items-center justify-center font-bold text-xs">SA</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">Sarah Altman</p>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">Admin Head</p>
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
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-[#0B1120]/80 backdrop-blur-xl border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Verdana, sans-serif', fontStyle: 'normal', fontWeight: 'bold' }}>Admin Dashboard</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Control panel, database triggers, approvals</p>
          </div>

          {/* Mobile Switcher */}
          <div className="md:hidden flex items-center gap-2">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-white/5 border border-white/10 text-xs px-3 py-1.5 rounded-xl text-white outline-none"
            >
              <option value="home">Dashboard</option>
              <option value="hr-verify">HR Approval</option>
              <option value="mentor-verify">Mentor Approval</option>
              <option value="internships">Jobs Directory</option>
              <option value="mentors">Manage Mentors</option>
              <option value="groups">Groups</option>
            </select>
            <button onClick={logout} className="p-1.5 text-red-400 text-xs font-semibold">Logout</button>
          </div>
        </header>

        {/* Views */}
        <div className="p-6 space-y-8 flex-1">
          
          {/* ==================== 1. HOME / OVERVIEW TAB ==================== */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              
              {/* Header banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-400/20">
                <span className="px-3 py-1 bg-yellow-400 text-zinc-950 text-xs font-bold tracking-widest rounded-full uppercase">Admin Overview</span>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">Platform Analytics & Global States</h3>
                <p className="text-sm text-gray-400 mt-1">Configure relations, groups, and approve HR organizations with one click.</p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Interns</span>
                  <p className="text-3xl font-extrabold mt-1 text-white">{interns.length}</p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Mentors</span>
                  <p className="text-3xl font-extrabold mt-1 text-white">{mentors.length}</p>
                </div>
                <div className="p-5 bg-[#1F2937] border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pending HR Audits</span>
                  <p className="text-3xl font-extrabold mt-1 text-yellow-500">{pendingHRs.length}</p>
                </div>
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Certificates Issued</span>
                  <p className="text-3xl font-extrabold mt-1 text-emerald-400">{certificates.length}</p>
                </div>
              </div>

               {/* Application reviews & timeline snapshot */}
              <div className="grid lg:grid-cols-2 gap-6">
                
                {/* Left Column: HR & Mentor Approvals */}
                <div className="space-y-6">
                  {/* HR Pending list */}
                  <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
                    <h3 className="text-base font-bold mb-4">Pending HR Verifications</h3>
                    <div className="space-y-4">
                      {pendingHRs.map((hr, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                          <div>
                            <p className="font-semibold text-sm">{hr.name}</p>
                            <p className="text-xs text-gray-400">{hr.email}</p>
                          </div>
                          <button 
                            onClick={() => handleApproveHR(hr.uid)}
                            className="px-4 py-2 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all"
                          >
                            Approve Profile
                          </button>
                        </div>
                      ))}

                      {pendingHRs.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-12">No pending HR verifications in database.</p>
                      )}
                    </div>
                  </div>

                  {/* Mentor Pending list */}
                  <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
                    <h3 className="text-base font-bold mb-4">Pending Mentor Approvals</h3>
                    <div className="space-y-4">
                      {pendingMentors.map((mentor, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                          <div>
                            <p className="font-semibold text-sm">{mentor.name}</p>
                            <p className="text-xs text-gray-400">{mentor.email}</p>
                          </div>
                          <button 
                            onClick={() => handleApproveMentor(mentor.uid)}
                            className="px-4 py-2 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all"
                          >
                            Approve Profile
                          </button>
                        </div>
                      ))}

                      {pendingMentors.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-12">No pending Mentor approvals in database.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job queue approvals */}
                <div className="bg-[#111827] border border-white/10 rounded-3xl p-6">
                  <h3 className="text-base font-bold mb-4">Unapproved Job Postings</h3>
                  <div className="space-y-4">
                    {internships.filter(i => !i.approved).map((job, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <div>
                          <p className="font-semibold text-sm">{job.title}</p>
                          <p className="text-xs text-gray-400">{job.company}</p>
                        </div>
                        <button 
                          onClick={() => handleApproveInternship(job.id)}
                          className="px-4 py-2 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl"
                        >
                          Approve
                        </button>
                      </div>
                    ))}

                    {internships.filter(i => !i.approved).length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-12">All job listings are approved & active.</p>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ==================== 2. HR VERIFY TAB ==================== */}
          {activeTab === 'hr-verify' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight">HR Verification System</h3>
              <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-black/30 text-xs text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-4 px-6">Company Representative</th>
                      <th className="py-4 px-6">Email Address</th>
                      <th className="py-4 px-6">Role status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {pendingHRs.map((hr, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-4 px-6 font-semibold text-white">{hr.name}</td>
                        <td className="py-4 px-6 text-gray-300">{hr.email}</td>
                        <td className="py-4 px-6 text-yellow-400 font-bold uppercase text-xs">Awaiting Audit</td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => handleApproveHR(hr.uid)}
                            className="px-4 py-2 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl"
                          >
                            Approve Account
                          </button>
                        </td>
                      </tr>
                    ))}

                    {pendingHRs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500">No HR verification audits currently pending.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== MENTOR VERIFY TAB ==================== */}
          {activeTab === 'mentor-verify' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight">Mentor Verification System</h3>
              <div className="bg-[#111827] border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-black/30 text-xs text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="py-4 px-6">Mentor Name</th>
                      <th className="py-4 px-6">Email Address</th>
                      <th className="py-4 px-6">Role status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {pendingMentors.map((mentor, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-4 px-6 font-semibold text-white">{mentor.name}</td>
                        <td className="py-4 px-6 text-gray-300">{mentor.email}</td>
                        <td className="py-4 px-6 text-yellow-400 font-bold uppercase text-xs">Pending Review</td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => handleApproveMentor(mentor.uid)}
                            className="px-4 py-2 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl hover:opacity-90 transition-all"
                          >
                            Approve Profile
                          </button>
                        </td>
                      </tr>
                    ))}

                    {pendingMentors.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-500">No mentor verification audits currently pending.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 3. JOB DIRECTORY TAB ==================== */}
          {activeTab === 'internships' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight">All Posted Internships</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {internships.map((job, idx) => (
                  <div key={idx} className="bg-[#111827] border border-white/10 rounded-3xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-2.5 py-1 rounded bg-white/5 border text-xs font-semibold ${job.approved ? 'border-emerald-500/20 text-emerald-400' : 'border-yellow-500/20 text-yellow-400'}`}>
                          {job.approved ? 'Approved' : 'Pending Approval'}
                        </span>
                        <button 
                          onClick={() => handleDeleteInternship(job)}
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                          title="Delete Internship"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-base mb-1">{job.title}</h4>
                      <p className="text-xs text-gray-500 mb-3">{job.company}</p>
                      <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed mb-4">{job.description}</p>
                    </div>

                    {!job.approved && (
                      <button 
                        onClick={() => handleApproveInternship(job.id)}
                        className="w-full py-2 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl mt-4"
                      >
                        Approve Listing
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 4. MANAGE MENTORS TAB ==================== */}
          {activeTab === 'mentors' && (
            <div className="max-w-3xl mx-auto">
              {/* Mentors Directory list */}
              <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">Mentors Directory</h3>
                    <p className="text-xs text-gray-400 mt-1">Every created mentor account automatically appears here.</p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-400/15 text-yellow-300 font-bold text-xs rounded-full border border-yellow-400/30 self-start sm:self-center">
                    {mentors.length} Registered {mentors.length === 1 ? 'Mentor' : 'Mentors'}
                  </span>
                </div>
                
                {mentors.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-sm text-gray-400">No mentors registered yet.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                    {mentors.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                        <img 
                          src={m.profile?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} 
                          className="w-12 h-12 rounded-full bg-gray-800 border border-white/10 shadow-inner" 
                          alt={m.name} 
                        />
                        <div className="overflow-hidden">
                          <p className="font-bold text-sm text-white truncate">{m.name}</p>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-300 text-[10px] rounded border border-indigo-500/20">
                            Mentor
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 5. GROUPS & PROJECTS TAB ==================== */}
          {activeTab === 'groups' && (
            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* Cohort Group Creation & Student Assignment */}
              <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-6">Create Cohort & Assign Students</h3>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Cohort Group Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Group Alpha" 
                      required
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Select Assigned Mentor</label>
                    <select 
                      required
                      value={selectedMentorId}
                      onChange={(e) => setSelectedMentorId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="">Select Mentor</option>
                      {mentors.map((m, idx) => (
                        <option key={idx} value={m.uid} className="bg-[#111827]">{m.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Multi Student Select checkboxes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 block">Select Cohort Students</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                      {interns.map((intern, i) => (
                        <label key={i} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={selectedStudentIds.includes(intern.uid)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, intern.uid]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== intern.uid));
                              }
                            }}
                            className="w-4 h-4 bg-white/5 rounded border border-white/10 accent-yellow-400"
                          />
                          <span>{intern.name} ({intern.email})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isCreatingGroup}
                    className="w-full py-3 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl"
                  >
                    {isCreatingGroup ? "Creating Group..." : "Assemble Group"}
                  </button>
                </form>
              </div>

              {/* Assign Projects to Groups */}
              <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 sm:p-8">
                <h3 className="text-lg font-bold mb-6">Assign Project Milestone</h3>
                <form onSubmit={handleAssignProject} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Select Cohort Group</label>
                    <select 
                      required
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="">Select Group</option>
                      {groups.map((g, idx) => (
                        <option key={idx} value={g.id} className="bg-[#111827]">{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Project Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mobile App Redesign" 
                      required
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Milestone Task Description</label>
                    <textarea 
                      rows={3}
                      placeholder="Describe project architecture, requirements, and deliverables..."
                      required
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">Submission Deadline</label>
                    <input 
                      type="date" 
                      required
                      value={projectDeadline}
                      onChange={(e) => setProjectDeadline(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isAssigningProject}
                    className="w-full py-3 bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl"
                  >
                    {isAssigningProject ? "Assigning Milestone..." : "Assign Milestone Project"}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Group Assemble Successfully Glassmorphic Popup */}
      <AnimatePresence>
        {showAssembleSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAssembleSuccess(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            {/* Glassmorphic Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-sm w-full overflow-hidden bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] z-10"
            >
              {/* Subtle glass gloss overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/5 to-transparent -translate-y-full animate-[pulse_3s_infinite]" />
              
              {/* Success Check with dynamic bounce */}
              <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] relative">
                <div className="absolute inset-0 bg-emerald-500/5 blur-md rounded-2xl" />
                <Check className="w-8 h-8 relative z-10 animate-[bounce_1s_infinite]" />
              </div>

              {/* Title exactly as requested */}
              <h3 className="font-display text-xl font-bold text-emerald-400 mb-2 tracking-tight">
                Group Assemble Successfully
              </h3>
              
              {/* Details of the newly created Cohort */}
              <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                Cohort <span className="font-bold text-emerald-300">"{assembledGroupName}"</span> has been assembled with assigned mentors and students successfully registered.
              </p>

              {/* Theme-aligned action button */}
              <button
                onClick={() => setShowAssembleSuccess(false)}
                className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(16,185,129,0.1)]"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
