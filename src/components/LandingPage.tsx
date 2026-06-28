import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Laptop, 
  Briefcase, 
  TrendingUp, 
  Users, 
  Settings, 
  Scale, 
  ArrowRight, 
  Terminal, 
  Activity, 
  Check, 
  Star, 
  Search, 
  ShieldCheck, 
  MessageSquare, 
  FolderGit2, 
  X, 
  DollarSign, 
  MapPin, 
  Clock, 
  Calendar,
  Lock,
  Mail,
  User
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function LandingPage() {
  const { internships, setTab } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const departments = [
    { name: 'Information Technology', icon: Laptop, color: 'text-indigo-400', count: '12,458' },
    { name: 'Business & Finance', icon: TrendingUp, color: 'text-cyan-400', count: '8,291' },
    { name: 'Marketing & Communications', icon: Activity, color: 'text-emerald-400', count: '5,732' },
    { name: 'Human Resources', icon: Users, color: 'text-indigo-400', count: '3,812' },
    { name: 'Engineering', icon: Settings, color: 'text-cyan-400', count: '14,609' },
    { name: 'Legal', icon: Scale, color: 'text-emerald-400', count: '2,184' },
  ];

  const stories = [
    { name: 'Maya Patel', college: 'Stanford • Class of 2025', text: '"Secured my dream internship at OpenAI through Internship-Portal. The matching quality is unmatched."', role: 'Software Engineer Intern', company: 'OpenAI', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya' },
    { name: 'Liam Torres', college: 'MIT • Class of 2024', text: '"Landed an internship at Stripe within two weeks of signing up. Incredible platform."', role: 'Product Intern', company: 'Stripe', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam' },
    { name: 'Sofia Chen', college: 'Harvard • Class of 2025', text: '"The quality of opportunities and the application tracking dashboard are best-in-class."', role: 'Marketing Intern', company: 'Notion', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia' },
  ];

  const faqs = [
    { q: 'Is Internship-Portal free for students?', a: 'Yes, Internship-Portal is completely free for students. Premium features are available for companies.' },
    { q: 'How do I get matched with companies?', a: 'Our intelligent AI matches you based on your skills, preferences, and career goals.' },
    { q: 'What companies are on the platform?', a: "We partner with the world's leading tech companies, startups, and Fortune 500s." }
  ];

  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Filter internships based on search term & department
  const filteredInternships = internships.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept ? item.department === selectedDept : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="relative bg-[#0B1120] text-white min-h-screen overflow-x-hidden">
      {/* Background Orbs */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#4F46E5]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-40 left-20 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Grid Pattern */}
      <div className="absolute inset-0 bg-repeat bg-center opacity-[0.02] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-10V8h-2v16h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 6v-4H4v4H0v2h4v4h2V8h4V6H6z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 relative z-10 pt-24 pb-20">
        
        {/* Banner Announcement */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-x-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm font-semibold tracking-tight">
            <span className="w-2.5 h-2.5 bg-[#10B981] rounded-full animate-pulse"></span>
            2026 Internships now open • Real-time database enabled
          </span>
        </div>

        {/* Hero Headline */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold tracking-tight font-display leading-[1.1] mb-6"
          >
            Launch Your Career<br />with the Right <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#10B981]">Internship.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto mb-10"
          >
            The premium platform connecting ambitious students with top-tier companies worldwide. Fully automated and secure.
          </motion.p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button 
              onClick={() => setTab('auth-login')}
              className="w-full sm:w-auto px-8 h-14 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-semibold rounded-3xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-x-3"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setTab('auth-register')}
              className="w-full sm:w-auto px-8 h-14 border border-white/20 hover:bg-white/5 text-white font-semibold rounded-3xl transition-all"
            >
              Register as Student/HR
            </button>
          </div>
        </div>

        {/* Brand Logos */}
        <div className="text-center pb-20 border-b border-white/5">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-6 font-semibold">Empowering students from world class partners</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-60">
            <span className="font-bold text-2xl tracking-tighter">Stripe</span>
            <span className="font-bold text-2xl tracking-tighter">Vercel</span>
            <span className="font-bold text-2xl tracking-tighter">OpenAI</span>
            <span className="font-bold text-2xl tracking-tighter">Linear</span>
            <span className="font-bold text-2xl tracking-tighter">Notion</span>
          </div>
        </div>

        {/* Live Internship Feed Section */}
        <div className="pt-20 pb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-[#4F46E5] text-xs font-bold tracking-widest uppercase">LIVE PORTAL DIRECTORY</span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1 font-display">Active Internships</h2>
              <p className="text-sm text-gray-400 mt-1">Directly integrated with Google Firestore storage and roles</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search active roles..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:border-[#4F46E5]/50 focus:ring-1 focus:ring-[#4F46E5]/30 transition-all text-white"
              />
            </div>
          </div>

          {/* Department Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button 
              onClick={() => setSelectedDept(null)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${!selectedDept ? 'bg-[#4F46E5] text-white border border-[#4F46E5]' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}
            >
              All Departments
            </button>
            {departments.map((dept, i) => (
              <button 
                key={i}
                onClick={() => setSelectedDept(dept.name)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${selectedDept === dept.name ? 'bg-[#4F46E5] text-white border border-[#4F46E5]' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}
              >
                {dept.name}
              </button>
            ))}
          </div>

          {/* Internships Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInternships.length > 0 ? (
              filteredInternships.map((item, idx) => (
                <motion.div 
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#111827] border border-white/10 rounded-3xl p-6 hover:border-[#4F46E5]/40 transition-all shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} className="w-12 h-12 rounded-xl object-contain bg-white p-1" alt={item.company} />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#6366F1] flex items-center justify-center font-bold text-white text-xl">
                          {item.company[0]}
                        </div>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>

                    <h3 className="font-semibold text-lg text-white mb-1 leading-snug">{item.title}</h3>
                    <p className="text-xs text-gray-400 mb-4">{item.company} • {item.location}</p>
                    <p className="text-sm text-gray-300 line-clamp-3 mb-6 leading-relaxed">{item.description}</p>
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-white/5 rounded-lg text-gray-300">
                        <Clock className="w-3 h-3 text-[#06B6D4]" /> {item.duration}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-white/5 rounded-lg text-gray-300">
                        <MapPin className="w-3 h-3 text-[#4F46E5]" /> {item.location}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div>
                        <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">STIPEND</p>
                        <p className="text-sm font-bold text-emerald-400">{item.stipend}</p>
                      </div>
                      <button 
                        onClick={() => setTab('auth-login')}
                        className="px-4 py-2 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-semibold text-xs rounded-xl hover:opacity-90 transition-all"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500 bg-[#111827] rounded-3xl border border-dashed border-white/10">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No active internships found matching your search or filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div id="features" className="py-20 border-t border-white/5">
          <div className="text-center mb-16">
            <span className="px-4 py-1 text-[10px] font-bold tracking-widest bg-white/10 rounded-full uppercase">PREMIUM PLATFORM</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl tracking-tighter font-semibold">Built for ambitious teams and students</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 border border-white/10 bg-[#111827] rounded-3xl">
              <Terminal className="text-3xl text-[#4F46E5] mb-4" />
              <h4 className="font-semibold text-lg mb-2">Automated Rules</h4>
              <p className="text-sm text-gray-400">Zero-Trust Firestore security ensures total privacy of your documents & applications.</p>
            </div>
            <div className="p-6 border border-white/10 bg-[#111827] rounded-3xl">
              <ShieldCheck className="text-3xl text-[#06B6D4] mb-4" />
              <h4 className="font-semibold text-lg mb-2">Verified HR Profiles</h4>
              <p className="text-sm text-gray-400">Strict manual verification for company administrators guarantees high-quality listings.</p>
            </div>
            <div className="p-6 border border-white/10 bg-[#111827] rounded-3xl">
              <MessageSquare className="text-3xl text-[#10B981] mb-4" />
              <h4 className="font-semibold text-lg mb-2">Real-Time Chat</h4>
              <p className="text-sm text-gray-400">Private & group chats directly connecting interns to assigned mentors.</p>
            </div>
            <div className="p-6 border border-white/10 bg-[#111827] rounded-3xl">
              <FolderGit2 className="text-3xl text-[#F59E0B] mb-4" />
              <h4 className="font-semibold text-lg mb-2">Project Evaluator</h4>
              <p className="text-sm text-gray-400">Allows students to upload files and mentors to submit real-time ratings & feedback.</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div id="how" className="py-16 bg-[#111827] rounded-3xl border border-white/10 px-8 text-center my-16">
          <div className="max-w-2xl mx-auto mb-12">
            <span className="text-[#4F46E5] text-xs font-bold tracking-widest uppercase">SIMPLE PROCESS</span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter font-display mt-1">Complete Workflow</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white mb-4 mx-auto text-lg font-bold">1</div>
              <h4 className="font-semibold text-lg mb-2">Apply & Track</h4>
              <p className="text-gray-400 text-xs sm:text-sm">Submit your resume and view status changes live on your personal tracking timeline.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white mb-4 mx-auto text-lg font-bold">2</div>
              <h4 className="font-semibold text-lg mb-2">Mentor & Collab</h4>
              <p className="text-gray-400 text-xs sm:text-sm">Get matched to a group & project and complete milestones using automated evaluations.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white mb-4 mx-auto text-lg font-bold">3</div>
              <h4 className="font-semibold text-lg mb-2">Earn Certificate</h4>
              <p className="text-gray-400 text-xs sm:text-sm">Get evaluated by your mentor and immediately download your secure dynamic credential.</p>
            </div>
          </div>
        </div>

        {/* Success Stories */}
        <div className="py-16">
          <h2 className="text-3xl font-semibold font-display tracking-tight text-center mb-12">Student Success Stories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {stories.map((item, i) => (
              <div key={i} className="p-6 bg-[#111827] border border-white/10 rounded-3xl hover:border-white/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-x-4 mb-4">
                    <img src={item.img} className="w-11 h-11 rounded-2xl bg-gray-800" alt={item.name} />
                    <div>
                      <h4 className="font-semibold text-white">{item.name}</h4>
                      <p className="text-xs text-gray-400">{item.college}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed italic">{item.text}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">{item.role}</span>
                  <span className="text-emerald-400 font-bold">{item.company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="py-16 max-w-4xl mx-auto border-t border-white/5">
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-8 font-display">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-white/10 px-6 py-5 rounded-2xl bg-[#111827] cursor-pointer" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                <div className="flex justify-between items-center gap-4">
                  <div className="font-semibold text-sm sm:text-base">{faq.q}</div>
                  <span className="text-gray-400 text-lg">{faqOpen === i ? '−' : '+'}</span>
                </div>
                {faqOpen === i && (
                  <p className="mt-3 text-xs sm:text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/5 pt-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <div>© 2026 Internship-Portal.com. All rights reserved.</div>
          <div className="flex gap-x-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white transition-colors cursor-pointer">Trust & Safety</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
