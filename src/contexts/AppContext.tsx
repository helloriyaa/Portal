import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { 
  auth, 
  db 
} from '../firebase/config';
import { 
  getUserDoc, 
  createUserDoc, 
  getInternships, 
  subscribeToNotifications,
  seedDemoData,
  getApplicationsForIntern,
  getApplicationsForHR,
  getInternshipsForHR,
  getApplicationsAll,
  getProjectsForStudent,
  getProjectsForMentor,
  getGroupsForMentor,
  getGroupsAll,
  getCertificatesForStudent
} from '../firebase/services';
import { 
  UserDoc, 
  Internship, 
  Application, 
  NotificationDoc,
  ProjectDoc,
  GroupDoc,
  CertificateDoc,
  UserRole
} from '../types';

interface AppContextType {
  user: UserDoc | null;
  loading: boolean;
  internships: Internship[];
  applications: Application[];
  notifications: NotificationDoc[];
  projects: ProjectDoc[];
  groups: GroupDoc[];
  certificates: CertificateDoc[];
  currentRole: UserRole | null;
  activeTab: string; // Current page/view in SPA
  setTab: (tab: string) => void;
  refreshData: () => Promise<void>;
  logout: () => Promise<void>;
  setCurrentUserByUid: (uid: string) => Promise<void>;
  isAdminApproved: boolean;
  approvalPopup: 'waiting' | 'under-request' | null;
  setApprovalPopup: (val: 'waiting' | 'under-request' | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [projects, setProjects] = useState<ProjectDoc[]>([]);
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [certificates, setCertificates] = useState<CertificateDoc[]>([]);
  const [activeTab, setTab] = useState<string>('landing'); // Default is landing page
  const [approvalPopup, setApprovalPopup] = useState<'waiting' | 'under-request' | null>(null);

  // Automatically seed on initial load if needed
  useEffect(() => {
    const initSeed = async () => {
      try {
        await seedDemoData();
      } catch (err) {
        console.error("Error seeding:", err);
      }
    };
    initSeed();
  }, []);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        // Fetch user doc
        let userDoc = await getUserDoc(user.uid);
        
        // Fix race condition: wait for registration to create the doc
        if (!userDoc && (window as any).__justRegistered) {
          let retries = 5;
          while (!userDoc && retries > 0) {
            await new Promise(r => setTimeout(r, 400));
            userDoc = await getUserDoc(user.uid);
            retries--;
          }
        }

        if (!userDoc) {
          // If logged in via Google but doc doesn't exist, create default Intern role
          userDoc = await createUserDoc(user.uid, user.displayName || 'User', user.email || '', 'intern');
        }

        if ((userDoc.role === 'hr' || userDoc.role === 'mentor') && !userDoc.approved) {
          const wasRegister = (window as any).__justRegistered;
          (window as any).__justRegistered = false;
          
          // Defer signOut slightly to let the login/registration promise resolve cleanly
          setTimeout(async () => {
            try {
              await signOut(auth);
            } catch (err) {
              console.error("Error signing out:", err);
            }
          }, 100);

          setUser(null);
          setFbUser(null);
          setTab('auth-login');
          setApprovalPopup(wasRegister ? 'waiting' : 'under-request');
          setLoading(false);
          return;
        }

        (window as any).__justRegistered = false;
        setUser(userDoc);
        
        const authRoutes = ['landing', 'auth-login', 'auth-register'];
        if (authRoutes.includes(activeTab)) {
          setTab(userDoc.role === 'admin' ? 'admin' : `${userDoc.role}-dashboard`);
        }
      } else {
        setUser(null);
        const publicRoutes = ['landing', 'auth-login', 'auth-register'];
        if (!publicRoutes.includes(activeTab)) {
          setTab('auth-login');
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [activeTab]);

  // Sync notifications in real-time if logged in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const unsubNotifs = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });

    return unsubNotifs;
  }, [user]);

  // Load and refresh core dashboard data based on role
  const refreshData = async () => {
    if (!user) {
      // For public landing page
      const list = await getInternships(true);
      setInternships(list);
      return;
    }

    try {
      // 1. Load internships (filtered for HR, all approved/all for others)
      if (user.role === 'hr') {
        const myInternships = await getInternshipsForHR(user.uid);
        setInternships(myInternships);
      } else {
        const allInternships = await getInternships(user.role !== 'admin');
        setInternships(allInternships);
      }

      // 2. Load data based on Role
      if (user.role === 'intern') {
        const apps = await getApplicationsForIntern(user.uid);
        setApplications(apps);
        const projs = await getProjectsForStudent(user.uid);
        setProjects(projs);
        const certs = await getCertificatesForStudent(user.uid);
        setCertificates(certs);
      } else if (user.role === 'hr') {
        const apps = await getApplicationsForHR(user.uid);
        setApplications(apps);
      } else if (user.role === 'mentor') {
        const mentorGroups = await getGroupsForMentor(user.uid);
        setGroups(mentorGroups);
        const mentorProjects = await getProjectsForMentor(user.uid);
        setProjects(mentorProjects);
      } else if (user.role === 'admin') {
        const apps = await getApplicationsAll();
        setApplications(apps);
        const allGroups = await getGroupsAll();
        setGroups(allGroups);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  // Trigger refresh when user changes
  useEffect(() => {
    refreshData();
  }, [user]);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFbUser(null);
    setTab('auth-login');
  };

  // Quick Switch/Log In Helper for demo purposes
  const setCurrentUserByUid = async (uid: string) => {
    setLoading(true);
    const userDoc = await getUserDoc(uid);
    if (userDoc) {
      setUser(userDoc);
      setTab(userDoc.role === 'admin' ? 'admin' : `${userDoc.role}-dashboard`);
    }
    setLoading(false);
  };

  return (
    <AppContext.Provider value={{
      user,
      loading,
      internships,
      applications,
      notifications,
      projects,
      groups,
      certificates,
      currentRole: user ? user.role : null,
      activeTab,
      setTab,
      refreshData,
      logout,
      setCurrentUserByUid,
      isAdminApproved: user ? ((user.role === 'hr' || user.role === 'mentor') ? !!user.approved : true) : false,
      approvalPopup,
      setApprovalPopup
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
