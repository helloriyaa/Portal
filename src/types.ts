export type UserRole = 'intern' | 'hr' | 'mentor' | 'admin';

export interface UserProfile {
  photoUrl?: string;
  education?: string;
  skills?: string[];
  resumeUrl?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: any;
  approved?: boolean; // Required for HR approval
  profile?: UserProfile;
  bookmarkedInternships?: string[];
}

export interface Internship {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  description: string;
  department: string;
  duration: string;
  seats: number;
  deadline: string;
  stipend: string;
  location: string;
  postedBy: string; // HR uid
  status: 'active' | 'paused';
  approved: boolean; // Admin approval status
}

export interface Application {
  id: string;
  internshipId: string;
  internshipTitle: string;
  company: string;
  internId: string;
  internName: string;
  internEmail: string;
  resumeUrl?: string;
  cvUrl?: string;
  coverLetterText?: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: any;
  adminReviewed?: boolean;
}

export interface GroupDoc {
  id: string;
  name: string;
  mentorId: string;
  mentorName: string;
  studentIds: string[];
  projectId?: string;
  projectTitle?: string;
}

export interface ProjectDoc {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  deadline: string;
  groupId: string;
  studentId: string; // Assignee
  status: 'assigned' | 'submitted' | 'reviewed';
  githubUrl?: string;
  reportUrl?: string;
  submissionText?: string;
  submittedAt?: any;
  rating?: number; // out of 10
  reviewComments?: string;
  reviewedAt?: any;
}

export interface MessageDoc {
  id: string;
  chatId: string; // Can be groupId or studentId_mentorId for private chat
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  sentAt: any;
}

export interface NotificationDoc {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  sentAt: any;
}

export interface CertificateDoc {
  id: string;
  studentId: string;
  studentName: string;
  company: string;
  internshipTitle: string;
  mentorName: string;
  rating: number;
  issueDate: string;
  certificateId: string;
  pdfUrl?: string;
}
