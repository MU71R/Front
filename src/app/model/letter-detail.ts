export interface Decision {
  _id: string;
  title: string;
  sector?: {
    _id: string;
    sector: string;
  };
  supervisor?: string;
  isPresidentDecision?: boolean;
  createdAt?: string;
}

export interface User {
  _id: string;
  username: string;
  fullname: string;
  role: string;
  sector?: string;
}

export interface RecentActivit {
  id: string;
  message: string; // نص جاهز
  time: string;    // وقت جاهز
  status?: string;
  // user: User;
}

export interface LetterDetail {
  _id: string;
  title: string;
  description: string;
  notes: string;
  signatureType: string;
  pdfUrl: string;
  decision: Decision; 
  reasonForRejection: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  user: User;
  createdAt?: string;
  updatedAt?: string;
}
