// src/app/model/Letter.ts
import { MainCriteria, SubCriteria } from './criteria';

/**
 * واجهة القرار (Letter)
 */
export interface Letter {
  _id: string;
  title: string;
  descriptions: string[];
  Rationale: string[];
  date?: Date | string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'amendment' | 'canceled';
  user?: any;
  
  // المعايير الجديدة (بدلاً من decision)
  mainCriteria: string | MainCriteria;
  subCriteria: string | SubCriteria;
  
  // حقول التعيين الجديدة
  fullName?: string;
  entityName?: string;
  nationalId?: string;
  phoneNumber?: string;
  
  letterType?: 'رئاسة الوزراء' | 'رئاسة الجمهورية' | 'وزارة التعليم العالي' | 'عامة' | 'اخرى';
  attachment?: string;
  breeif?: string;
  signatureType?: 'الممسوحة ضوئيا' | 'حقيقية';
  approvals?: Array<{
    userId: string;
    role: 'supervisor' | 'UniversityPresident';
    approved: boolean;
    date: Date;
  }>;
  StartDate?: Date | string;
  
  EndDate?: Date | string;
  reasonForRejection?: string;
  transactionNumber?: number;
  createdAt?: Date | string;
  expiredNotificationSent?: boolean;
}

/**
 * واجهة إضافة قرار جديد
 */
export interface AddLetterPayload {
  title: string;
  descriptions: string[];
  Rationale: string[];
  mainCriteria: string;
  subCriteria: string;
  fullName?: string;
  entityName?: string;
  nationalId?: string;
  phoneNumber?: string;
  signatureType?: string;
  date: string;
  StartDate?: string | null;
  EndDate?: string | null;
}

/**
 * واجهة استجابة إضافة قرار
 */
export interface AddLetterResponse {
  success: boolean;
  message: string;
  data: Letter;
}