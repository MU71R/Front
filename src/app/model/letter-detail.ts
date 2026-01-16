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

  descriptions: string[];
  Rationale: string[];

  StartDate: string;
  EndDate: string;

  fullName: string;
  entityName: string | null;
  nationalId: string;
  phoneNumber: string;

  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'canceled';

  date: string;
  createdAt?: string;
  updatedAt?: string;

  user: User;

  mainCriteria?: {
    _id: string;
    name: string;
  };

  subCriteria?: {
    _id: string;
    name: string;
  };

  letterType?: string;
  signatureType?: string | null;

  // Properties needed for rejected letters
  decision?: {
    _id?: string;
    title?: string;
  };
  reasonForRejection?: string;
  pdfUrl?: string;
}

export interface DraftLetter extends LetterDetail {
  isDraft: boolean;
  savedAt: Date;
  lastModified: Date;
}

export interface LetterDetail {
  SaveStatus?: string;
}

export interface DraftLetterDetail extends LetterDetail {
  SaveStatus: "مسودة" | "مكتمل";
}

