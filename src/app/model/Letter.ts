// src/app/model/Letter.ts

export interface User {
  id: string;
  role: 'admin' | 'user' | string;
  name?: string;
}

export interface Letter {
  title: string;
  descriptions: string[]; 
  Rationale: string[];
  decision: string; 
  date: string | Date;
  status?: 'pending' | 'approved' | 'rejected' | 'in_progress';
  user?: string;
}

export interface addLetter {
  _id: string;
  title: string;
  descriptions: string[]; 
  Rationale: string[];
  decision: {
    _id: string;
    title: string;
    sector: string;
    supervisor: string;
    isPresidentDecision: boolean;
    createdAt: string;
  };
  date: string;
  status: string;
  user?: {
    _id: string;
    username: string;
    fullname: string;
    role: string;
    sector: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
}