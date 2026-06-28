import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './config';
import { 
  UserDoc, 
  UserProfile,
  Internship, 
  Application, 
  GroupDoc, 
  ProjectDoc, 
  MessageDoc, 
  NotificationDoc, 
  CertificateDoc,
  UserRole
} from '../types';

// ==========================================
// 1. AUTHENTICATION SERVICES
// ==========================================

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data() as UserDoc;
    if (data.email && data.email.toLowerCase() === 'helloriya48@gmail.com' && data.role !== 'admin') {
      await updateDoc(userRef, { role: 'admin', approved: true });
      data.role = 'admin';
      data.approved = true;
    }
    return data;
  }
  return null;
}

export async function createUserDoc(uid: string, name: string, email: string, role: UserRole): Promise<UserDoc> {
  const userRef = doc(db, 'users', uid);
  const finalRole = email.toLowerCase() === 'helloriya48@gmail.com' ? 'admin' : role;
  const newUser: UserDoc = {
    uid,
    name,
    email,
    role: finalRole,
    createdAt: serverTimestamp(),
    approved: (finalRole === 'admin' || finalRole === 'intern') ? true : false, // HR and Mentor need admin approval, interns are pre-approved
    profile: {
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
      skills: [],
      education: ''
    },
    bookmarkedInternships: []
  };
  await setDoc(userRef, newUser);
  return newUser;
}

export async function updateUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data() as UserDoc;
    const currentProfile = data.profile || {};
    await updateDoc(userRef, {
      profile: {
        ...currentProfile,
        ...profile
      }
    });
  }
}

// ==========================================
// 2. INTERNSHIP CRUD SERVICES
// ==========================================

export async function getInternships(onlyApproved = true): Promise<Internship[]> {
  const internshipsRef = collection(db, 'internships');
  let q = query(internshipsRef);
  if (onlyApproved) {
    q = query(internshipsRef, where('approved', '==', true));
  }
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Internship));
}

export async function createInternship(internship: Omit<Internship, 'id' | 'approved'>): Promise<string> {
  const internshipsRef = collection(db, 'internships');
  const docRef = await addDoc(internshipsRef, {
    ...internship,
    approved: true, // Auto-approve or map correctly
  });
  return docRef.id;
}

export async function updateInternshipStatus(id: string, status: 'active' | 'paused'): Promise<void> {
  const docRef = doc(db, 'internships', id);
  await updateDoc(docRef, { status });
}

export async function deleteInternship(id: string): Promise<void> {
  const docRef = doc(db, 'internships', id);
  await deleteDoc(docRef);
}

export async function approveInternshipByAdmin(id: string, approved: boolean): Promise<void> {
  const docRef = doc(db, 'internships', id);
  await updateDoc(docRef, { approved });
}

// ==========================================
// 3. BOOKMARK SERVICES
// ==========================================

export async function toggleBookmark(uid: string, internshipId: string, isBookmarked: boolean): Promise<void> {
  const userRef = doc(db, 'users', uid);
  if (isBookmarked) {
    await updateDoc(userRef, {
      bookmarkedInternships: arrayRemove(internshipId)
    });
  } else {
    await updateDoc(userRef, {
      bookmarkedInternships: arrayUnion(internshipId)
    });
  }
}

// ==========================================
// 4. APPLICATION SERVICES
// ==========================================

export async function applyForInternship(app: Omit<Application, 'id' | 'appliedAt' | 'status'>): Promise<string> {
  const appsRef = collection(db, 'applications');
  const newApp = {
    ...app,
    status: 'pending' as const,
    appliedAt: serverTimestamp()
  };
  const docRef = await addDoc(appsRef, newApp);

  // Send real-time notification to the student/intern
  await createNotification(app.internId, "Application Submitted", `Your application for ${app.internshipTitle} at ${app.company} has been submitted.`);
  
  return docRef.id;
}

export async function getApplicationsForIntern(internId: string): Promise<Application[]> {
  const appsRef = collection(db, 'applications');
  const q = query(appsRef, where('internId', '==', internId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
}

export async function getInternshipsForHR(hrUid: string): Promise<Internship[]> {
  const internshipsRef = collection(db, 'internships');
  const q = query(internshipsRef, where('postedBy', '==', hrUid));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Internship));
}

export async function getApplicationsForHR(hrUid: string): Promise<Application[]> {
  const internships = await getInternshipsForHR(hrUid);
  const internshipIds = internships.map(i => i.id);
  if (internshipIds.length === 0) {
    return [];
  }
  const appsRef = collection(db, 'applications');
  const snap = await getDocs(appsRef);
  const allApps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
  return allApps.filter(app => internshipIds.includes(app.internshipId));
}

export async function getApplicationsAll(): Promise<Application[]> {
  const appsRef = collection(db, 'applications');
  const snap = await getDocs(appsRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
}

export async function updateApplicationStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const docRef = doc(db, 'applications', id);
  await updateDoc(docRef, { status });

  // Get application to send notification
  const appSnap = await getDoc(docRef);
  if (appSnap.exists()) {
    const app = appSnap.data() as Application;
    await createNotification(
      app.internId, 
      status === 'approved' ? "Application Approved!" : "Application Rejected", 
      `Your application for ${app.internshipTitle} has been ${status}.`
    );
  }
}

// ==========================================
// 5. GROUP & PROJECT SERVICES
// ==========================================

export async function getGroupsForMentor(mentorId: string): Promise<GroupDoc[]> {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('mentorId', '==', mentorId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupDoc));
}

export async function getGroupsAll(): Promise<GroupDoc[]> {
  const groupsRef = collection(db, 'groups');
  const snap = await getDocs(groupsRef);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupDoc));
}

export async function getGroupForStudent(studentId: string): Promise<GroupDoc | null> {
  const groupsRef = collection(db, 'groups');
  const snap = await getDocs(groupsRef);
  for (const doc of snap.docs) {
    const data = doc.data() as GroupDoc;
    if (data.studentIds && data.studentIds.includes(studentId)) {
      return { id: doc.id, ...data };
    }
  }
  return null;
}

export async function createGroupAndAssignMentor(groupName: string, mentorId: string, mentorName: string, studentIds: string[]): Promise<string> {
  const groupsRef = collection(db, 'groups');
  const docRef = await addDoc(groupsRef, {
    name: groupName,
    mentorId,
    mentorName,
    studentIds,
  });

  // Notify each student
  for (const sId of studentIds) {
    await createNotification(sId, "Group Assigned", `You have been assigned to ${groupName} under mentor ${mentorName}.`);
  }

  return docRef.id;
}

export async function assignProjectToGroup(groupId: string, projectTitle: string, description: string, techStack: string[], deadline: string): Promise<void> {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const groupData = groupSnap.data() as GroupDoc;

  // Create project document for the group/student
  const projectsRef = collection(db, 'projects');
  
  // Create project for each student in the group
  for (const sId of groupData.studentIds) {
    const projRef = await addDoc(projectsRef, {
      title: projectTitle,
      description,
      techStack,
      deadline,
      groupId,
      studentId: sId,
      status: 'assigned'
    });

    // Notify student
    await createNotification(sId, "Project Assigned", `New project assigned: ${projectTitle}. Deadline: ${deadline}`);
  }

  // Update group with project info
  await updateDoc(groupRef, {
    projectTitle: projectTitle
  });
}

export async function getProjectsForStudent(studentId: string): Promise<ProjectDoc[]> {
  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectDoc));
}

export async function getProjectsForMentor(mentorId: string): Promise<ProjectDoc[]> {
  // First get mentor groups
  const groups = await getGroupsForMentor(mentorId);
  const groupIds = groups.map(g => g.id);
  if (groupIds.length === 0) return [];

  const projectsRef = collection(db, 'projects');
  const q = query(projectsRef, where('groupId', 'in', groupIds));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectDoc));
}

export async function submitProject(projectId: string, githubUrl: string, reportUrl: string, submissionText: string): Promise<void> {
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    githubUrl,
    reportUrl,
    submissionText,
    status: 'submitted',
    submittedAt: serverTimestamp()
  });

  const projSnap = await getDoc(docRef);
  if (projSnap.exists()) {
    const proj = projSnap.data() as ProjectDoc;
    // Notify mentor or admin
    // Get group to find mentor
    const groupSnap = await getDoc(doc(db, 'groups', proj.groupId));
    if (groupSnap.exists()) {
      const group = groupSnap.data() as GroupDoc;
      await createNotification(group.mentorId, "Project Submitted", `Student has submitted the project: ${proj.title}.`);
    }
  }
}

export async function rateProjectAndIssueCertificate(projectId: string, rating: number, reviewComments: string): Promise<void> {
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    rating,
    reviewComments,
    status: 'reviewed',
    reviewedAt: serverTimestamp()
  });

  const projSnap = await getDoc(docRef);
  if (projSnap.exists()) {
    const proj = projSnap.data() as ProjectDoc;
    
    // Get student details
    const studentSnap = await getDoc(doc(db, 'users', proj.studentId));
    const student = studentSnap.exists() ? (studentSnap.data() as UserDoc) : null;
    const studentName = student ? student.name : "Student";

    // Get group details
    const groupSnap = await getDoc(doc(db, 'groups', proj.groupId));
    const group = groupSnap.exists() ? (groupSnap.data() as GroupDoc) : null;
    const mentorName = group ? group.mentorName : "Mentor";

    // Create Certificate Document
    const certId = `CERT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const certsRef = collection(db, 'certificates');
    const newCert: CertificateDoc = {
      id: certId,
      studentId: proj.studentId,
      studentName,
      company: "TechNova Labs", // Mapped from HR/Company
      internshipTitle: proj.title,
      mentorName,
      rating,
      issueDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      certificateId: certId,
      pdfUrl: "https://example.com/simulated-pdf.pdf"
    };

    await setDoc(doc(db, 'certificates', certId), newCert);

    // Notify Student
    await createNotification(
      proj.studentId, 
      "Certificate Generated!", 
      `Congratulations! Your certificate for ${proj.title} has been generated with a rating of ${rating}/10.`
    );
  }
}

export async function getCertificatesForStudent(studentId: string): Promise<CertificateDoc[]> {
  const certsRef = collection(db, 'certificates');
  const q = query(certsRef, where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CertificateDoc));
}

// ==========================================
// 6. MESSAGES / CHAT SERVICES
// ==========================================

export async function sendMessage(chatId: string, senderId: string, senderName: string, text: string, file?: { url: string, name: string, type: string }): Promise<void> {
  const msgsRef = collection(db, 'messages');
  await addDoc(msgsRef, {
    chatId,
    senderId,
    senderName,
    text,
    fileUrl: file?.url || null,
    fileName: file?.name || null,
    fileType: file?.type || null,
    sentAt: serverTimestamp()
  });
}

export function subscribeToMessages(chatId: string, callback: (msgs: MessageDoc[]) => void) {
  const msgsRef = collection(db, 'messages');
  const q = query(msgsRef, where('chatId', '==', chatId), orderBy('sentAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageDoc));
    callback(msgs);
  });
}

// ==========================================
// 7. NOTIFICATION SERVICES
// ==========================================

export async function createNotification(userId: string, title: string, message: string): Promise<void> {
  const notifsRef = collection(db, 'notifications');
  await addDoc(notifsRef, {
    userId,
    title,
    message,
    read: false,
    sentAt: serverTimestamp()
  });
}

export function subscribeToNotifications(userId: string, callback: (notifs: NotificationDoc[]) => void) {
  const notifsRef = collection(db, 'notifications');
  const q = query(notifsRef, where('userId', '==', userId), orderBy('sentAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationDoc));
    callback(notifs);
  });
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const docRef = doc(db, 'notifications', id);
  await updateDoc(docRef, { read: true });
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const notifsRef = collection(db, 'notifications');
  const q = query(notifsRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'notifications', d.id));
  }
}

// ==========================================
// 8. STORAGE / FILE UPLOAD SERVICES
// ==========================================

export async function uploadFileToStorage(file: File, pathStr: string): Promise<string> {
  const storageRef = ref(storage, `${pathStr}/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(storageRef, file);
  return getDownloadURL(snap.ref);
}

// ==========================================
// 9. DATABASE SEEDING FOR QA & TESTING
// ==========================================

export async function seedDemoData(): Promise<void> {
  // Check if data is already seeded
  const usersRef = collection(db, 'users');
  const snap = await getDocs(query(usersRef, where('role', '==', 'admin')));
  if (snap.size > 0) {
    console.log("Database already seeded");
    return;
  }

  // 1. Create default admin user
  const adminUid = "admin_demo_uid";
  await setDoc(doc(db, 'users', adminUid), {
    uid: adminUid,
    name: " Sarah Altman (Admin)",
    email: "helloriya48@gmail.com",
    role: "admin",
    createdAt: new Date(),
    approved: true,
    profile: {
      photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah_altman"
    }
  });

  // 2. Create Mentors
  const mentor1Id = "mentor1_demo_uid";
  await setDoc(doc(db, 'users', mentor1Id), {
    uid: mentor1Id,
    name: "Dr. Sarah Mitchell",
    email: "sarah.mitchell@internship.com",
    role: "mentor",
    createdAt: new Date(),
    approved: true,
    profile: {
      photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mentor"
    }
  });

  const mentor2Id = "mentor2_demo_uid";
  await setDoc(doc(db, 'users', mentor2Id), {
    uid: mentor2Id,
    name: "Dr. James Wilson",
    email: "james.wilson@internship.com",
    role: "mentor",
    createdAt: new Date(),
    approved: true,
    profile: {
      photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=James"
    }
  });

  // 3. Create HRs
  const hr1Id = "hr1_demo_uid";
  await setDoc(doc(db, 'users', hr1Id), {
    uid: hr1Id,
    name: "Ananya Verma",
    email: "ananya@technova.com",
    role: "hr",
    createdAt: new Date(),
    approved: true, // Approved by default for smooth demo
    profile: {
      photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya"
    }
  });

  // 4. Create Students / Interns
  const student1Id = "student1_demo_uid";
  await setDoc(doc(db, 'users', student1Id), {
    uid: student1Id,
    name: "Alex Johnson",
    email: "alex@university.edu",
    role: "intern",
    createdAt: new Date(),
    approved: true,
    profile: {
      photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=student1",
      education: "Stanford University - B.S. Computer Science",
      skills: ["React", "TypeScript", "Node.js", "Tailwind CSS"]
    },
    bookmarkedInternships: ["internship1_google", "internship3_stripe"]
  });

  const student2Id = "student2_demo_uid";
  await setDoc(doc(db, 'users', student2Id), {
    uid: student2Id,
    name: "Priya Sharma",
    email: "priya@university.edu",
    role: "intern",
    createdAt: new Date(),
    approved: true,
    profile: {
      photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
      education: "MIT - B.S. Information Technology",
      skills: ["Python", "PyTorch", "React Native", "Machine Learning"]
    },
    bookmarkedInternships: ["internship2_microsoft"]
  });

  // 5. Seed Internships
  const internships = [
    {
      id: "internship1_google",
      title: "Software Engineering Intern",
      company: "Google",
      logoUrl: "https://logo.clearbit.com/google.com",
      description: "Join the Google Browser team to work on next-generation features in Chrome. Highly collaborative and high impact role.",
      department: "Information Technology",
      duration: "6 months",
      seats: 12,
      deadline: "2026-10-15",
      stipend: "$8,500/mo",
      location: "Mountain View, CA",
      postedBy: hr1Id,
      status: "active" as const,
      approved: true
    },
    {
      id: "internship2_microsoft",
      title: "Product Manager Intern",
      company: "Microsoft",
      logoUrl: "https://logo.clearbit.com/microsoft.com",
      description: "Work on Microsoft Teams to drive features for hybrid collaboration. Define product roadmap and work with engineering.",
      department: "Business & Finance",
      duration: "3 months",
      seats: 5,
      deadline: "2026-11-20",
      stipend: "$7,200/mo",
      location: "Redmond, WA",
      postedBy: hr1Id,
      status: "active" as const,
      approved: true
    },
    {
      id: "internship3_stripe",
      title: "Frontend Developer Intern",
      company: "Stripe",
      logoUrl: "https://logo.clearbit.com/stripe.com",
      description: "Design and implement beautiful billing dashboards using React and TypeScript. Focus on performance and accessibility.",
      department: "Engineering",
      duration: "5 months",
      seats: 6,
      deadline: "2026-11-20",
      stipend: "$9,500/mo",
      location: "San Francisco, CA",
      postedBy: hr1Id,
      status: "active" as const,
      approved: true
    },
    {
      id: "internship4_openai",
      title: "ML Engineer Intern",
      company: "OpenAI",
      logoUrl: "https://logo.clearbit.com/openai.com",
      description: "Build state-of-the-art language model applications and fine-tuning pipelines. Deep research focus on security.",
      department: "Engineering",
      duration: "6 months",
      seats: 3,
      deadline: "2026-09-30",
      stipend: "$11,000/mo",
      location: "San Francisco, CA",
      postedBy: hr1Id,
      status: "active" as const,
      approved: true
    }
  ];

  for (const intern of internships) {
    await setDoc(doc(db, 'internships', intern.id), intern);
  }

  // 6. Seed Applications
  const apps = [
    {
      id: "app1",
      internshipId: "internship1_google",
      internshipTitle: "Software Engineering Intern",
      company: "Google",
      internId: student1Id,
      internName: "Alex Johnson",
      internEmail: "alex@university.edu",
      status: "approved" as const,
      appliedAt: new Date()
    },
    {
      id: "app2",
      internshipId: "internship2_microsoft",
      internshipTitle: "Product Manager Intern",
      company: "Microsoft",
      internId: student2Id,
      internName: "Priya Sharma",
      internEmail: "priya@university.edu",
      status: "pending" as const,
      appliedAt: new Date()
    }
  ];

  for (const app of apps) {
    await setDoc(doc(db, 'applications', app.id), app);
  }

  // 7. Seed Group
  const groupId = "group_alpha_uid";
  await setDoc(doc(db, 'groups', groupId), {
    id: groupId,
    name: "Group Alpha",
    mentorId: mentor1Id,
    mentorName: "Dr. Sarah Mitchell",
    studentIds: [student1Id, student2Id],
    projectTitle: "E-Commerce Platform"
  });

  // 8. Seed Projects
  const projects = [
    {
      id: "project1",
      title: "E-Commerce Platform",
      description: "Build a full-stack, responsive, and performance-optimized E-Commerce Platform with beautiful checkout workflows and stripe payment simulations.",
      techStack: ["React", "TypeScript", "Tailwind CSS", "Firebase"],
      deadline: "2026-12-28",
      groupId,
      studentId: student1Id,
      status: "assigned" as const
    },
    {
      id: "project2",
      title: "E-Commerce Platform",
      description: "Build a full-stack, responsive, and performance-optimized E-Commerce Platform with beautiful checkout workflows and stripe payment simulations.",
      techStack: ["React", "TypeScript", "Tailwind CSS", "Firebase"],
      deadline: "2026-12-28",
      groupId,
      studentId: student2Id,
      status: "submitted" as const,
      githubUrl: "https://github.com/priyasharma/ecommerce-premia",
      reportUrl: "https://example.com/priya_report.pdf",
      submissionText: "Completed all features including Stripe payments simulation and responsive cart system.",
      submittedAt: new Date()
    }
  ];

  for (const proj of projects) {
    await setDoc(doc(db, 'projects', proj.id), proj);
  }

  // 9. Seed Chat messages
  const messages = [
    {
      chatId: groupId,
      senderId: student1Id,
      senderName: "Alex Johnson",
      text: "Hey Dr. Sarah! I've started on the frontend structure.",
      sentAt: new Date(Date.now() - 3600000)
    },
    {
      chatId: groupId,
      senderId: mentor1Id,
      senderName: "Dr. Sarah Mitchell",
      text: "Excellent work Alex. Remember to focus on clean TypeScript typings.",
      sentAt: new Date(Date.now() - 1800000)
    }
  ];

  for (const msg of messages) {
    await addDoc(collection(db, 'messages'), msg);
  }

  // 10. Seed Notifications
  const notifs = [
    {
      userId: student1Id,
      title: "Application Approved!",
      message: "Congratulations! Your application for Software Engineering Intern has been approved.",
      read: false,
      sentAt: new Date()
    },
    {
      userId: student2Id,
      title: "Group Assigned",
      message: "You have been assigned to Group Alpha under Dr. Sarah Mitchell.",
      read: false,
      sentAt: new Date()
    }
  ];

  for (const notif of notifs) {
    await addDoc(collection(db, 'notifications'), notif);
  }
}
