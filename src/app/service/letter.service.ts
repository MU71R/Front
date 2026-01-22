import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { Letter } from '../model/Letter';
import { map } from 'rxjs/operators';
import { mergeMap} from 'rxjs/operators';
import { LetterDetail, RecentActivit } from '../model/letter-detail';
import { environment } from 'src/app/environments/environment';
import { throwError } from 'rxjs';
export interface PDFFile {
  _id: string;
  pdfurl: string;
  userId: {
    _id: string;
    fullname?: string;
    name?: string;
    role: string;
  };
  letterId: string;
  createdAt: string;
}

export interface DraftLetter {
  _id: string;
  title: string;
  descriptions: string[];
  Rationale: string[];
  date: Date;
  status?: string;
  user: {
    _id: string;
    fullname?: string;
    username?: string;
    role: string;
  };
  mainCriteria?: {
    _id: string;
    name: string;
  };
  subCriteria?: {
    _id: string;
    name: string;
  };
  fullName?: string;
  entityName?: string;
  nationalId?: string;
  phoneNumber?: string;
  letterType?: string;
  attachment?: string;
  breeif?: string;
  signatureType?: string;
  StartDate?: Date;
  EndDate?: Date;
  SaveStatus: "مسودة" | "مكتمل";
  transactionNumber?: number;
  createdAt: Date;
  tables?: any[];
  // إضافة خاصية أخرى إذا كانت موجودة
  attachments?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class LetterService {
  baseUrl = environment.apiUrl + '/letters';

  constructor(private http: HttpClient) { }

  // ==================== دوال المسودات ====================

  /**
   * جلب جميع مسودات القرارات الخاصة بالمستخدم
   * Endpoint: GET /letters/draft-letters
   */
  getDraftLetters(): Observable<{ success: boolean; data: DraftLetter[] }> {
    return this.http.get<{ success: boolean; data: DraftLetter[] }>(
      `${this.baseUrl}/draft-letters`
    );
  }

  /**
   * جلب مسودة قرار محددة بالـ ID
   * Endpoint: GET /letters/draft-letter/:id
   */
  getDraftLetterById(id: string): Observable<{ success: boolean; data: DraftLetter }> {
    return this.http.get<{ success: boolean; data: DraftLetter }>(
      `${this.baseUrl}/draft-letter/${id}`
    );
  }

  /**
   * حذف مسودة قرار
   * Endpoint: DELETE /letters/draft-letter/:id
   */
  deleteDraftLetter(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/draft-letter/${id}`
    );
  }

  /**
   * تحديث مسودة قرار
   * Endpoint: PUT /letters/draft-letter/:id
   */
  updateDraftLetter(id: string, payload: Partial<DraftLetter>): Observable<{ success: boolean; message: string; data: DraftLetter }> {
    return this.http.put<{ success: boolean; message: string; data: DraftLetter }>(
      `${this.baseUrl}/draft-letter/${id}`,
      payload
    );
  }

  /**
   * حفظ القرار كمسودة
   * Endpoint: POST /letters/add-letter (مع SaveStatus: "مسودة")
   */
  saveAsDraft(payload: any): Observable<{ success: boolean; message: string; data: DraftLetter }> {
    const draftPayload = {
      ...payload,
      SaveStatus: "مسودة"
    };
    return this.http.post<{ success: boolean; message: string; data: DraftLetter }>(
      `${this.baseUrl}/add-letter`,
      draftPayload
    );
  }

  /**
   * تحويل المسودة إلى قرار مكتمل
   * Endpoint: PUT /letters/update-letter/:id (مع SaveStatus: "مكتمل")
   */
  publishDraft(id: string, payload: Partial<DraftLetter>): Observable<{ success: boolean; message: string; data: LetterDetail }> {
    const publishPayload = {
      ...payload,
      SaveStatus: "مكتمل"
    };
    return this.http.put<{ success: boolean; message: string; data: LetterDetail }>(
      `${this.baseUrl}/update-letter/${id}`,
      publishPayload
    );
  }

  /**
   * جلب عدد المسودات
   */
  getDraftCount(): Observable<number> {
    return this.getDraftLetters().pipe(
      map(response => response.data.length),
      catchError(() => of(0))
    );
  }

  /**
   * التحقق إذا كان القرار مسودة
   */
  isDraft(letter: any): boolean {
    return letter.SaveStatus === "مسودة";
  }

  /**
   * الحصول على حالة الحفظ بالعربية
   */
  getSaveStatusArabic(saveStatus: string): string {
    const statusMap: { [key: string]: string } = {
      "مسودة": "مسودة",
      "مكتمل": "مكتمل"
    };
    return statusMap[saveStatus] || saveStatus;
  }

  // ==================== دوال تحديث الأرشيف ====================

  /**
   * تحديث قرار الأرشيف (مع رفع ملف)
   * Endpoint: PUT /letters/update-archive-letter/:id
   */
  updateArchiveLetter(id: string, formData: FormData): Observable<{ success: boolean; message: string; data: LetterDetail }> {
    return this.http.put<{ success: boolean; message: string; data: LetterDetail }>(
      `${this.baseUrl}/update-archive-letter/${id}`,
      formData
    );
  }

  // ==================== دوال إضافية للمسودات ====================

  /**
   * استخراج بيانات النموذج من المسودة
   */
  extractDraftFormData(draft: DraftLetter): any {
    return {
      title: draft.title,
      descriptions: draft.descriptions || [],
      Rationale: draft.Rationale || [],
      fullName: draft.fullName || '',
      entityName: draft.entityName || '',
      nationalId: draft.nationalId || '',
      phoneNumber: draft.phoneNumber || '',
      mainCriteria: draft.mainCriteria?._id || '',
      subCriteria: draft.subCriteria?._id || '',
      signatureType: draft.signatureType || 'حقيقية',
      date: draft.date ? new Date(draft.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      StartDate: draft.StartDate ? new Date(draft.StartDate).toISOString().split('T')[0] : '',
      EndDate: draft.EndDate ? new Date(draft.EndDate).toISOString().split('T')[0] : '',
      SaveStatus: "مسودة"
    };
  }

  /**
   * إنشاء كائن FormData للمسودة
   */
  createDraftFormData(draftData: any): FormData {
    const formData = new FormData();

    // إضافة الحقول النصية
    Object.keys(draftData).forEach(key => {
      if (key === 'descriptions' || key === 'Rationale') {
        // معالجة المصفوفات
        draftData[key].forEach((item: string, index: number) => {
          formData.append(`${key}[${index}]`, item);
        });
      } else if (draftData[key] !== null && draftData[key] !== undefined) {
        formData.append(key, draftData[key]);
      }
    });

    return formData;
  }

  /**
   * نسخ مسودة
   */
  /**
 * نسخ مسودة
 */
duplicateDraft(draftId: string): Observable<{ success: boolean; message: string; data: DraftLetter }> {
  return this.getDraftLetterById(draftId).pipe(
    map(response => response.data),
    mergeMap(draft => {
      const { _id, createdAt, updatedAt, ...duplicateData } = draft as any;
      duplicateData.title = `نسخة من ${duplicateData.title}`;
      duplicateData.SaveStatus = "مسودة";
      return this.saveAsDraft(duplicateData);
    })
  );
}

  // ==================== دوال الباك الأصلية المحدثة ====================

  /**
   * إضافة قرار جديد
   * Endpoint: POST /letters/add-letter
   */
  addLetterType(payload: any): Observable<{ success: boolean; message: string; data: Letter }> {
    return this.http.post<{ success: boolean; message: string; data: Letter }>(
      `${this.baseUrl}/add-letter`,
      payload
    );
  }

  /**
   * حذف قرار
   * Endpoint: DELETE /letters/delete-letter/:id
   */
  deleteLetterType(id: string): Observable<Letter> {
    return this.http.delete<Letter>(`${this.baseUrl}/delete-letter/${id}`);
  }

  /**
   * تحديث قرار
   * Endpoint: PUT /letters/update-letter/:id
   */
  // في letter.service.ts
updateLetter(id: string, data: any): Observable<any> {
  return this.http.put(`${this.baseUrl}/update-letter/${id}`, data).pipe(
    map((response: any) => {
      // تنسيق الـ response لتكون متوافقة
      if (response.success !== undefined) {
        return response;
      } else if (response._id) {
        return { success: true, data: response };
      } else {
        return { success: false, message: 'Response format error' };
      }
    }),
    catchError(error => {
      console.error('Error updating letter:', error);
      return throwError(error);
    })
  );
}

  /**
   * جلب جميع القرارات
   * Endpoint: GET /letters/all-letters
   */
  getLetterTypes(): Observable<{ success: boolean; data: Letter[] }> {
    return this.http.get<{ success: boolean; data: Letter[] }>(
      `${this.baseUrl}/all-letters`
    );
  }

  /**
   * جلب القرارات الخاصة بالمشرف
   * Endpoint: GET /letters/get-supervisor-letters
   */
  getLetterSupervisor(): Observable<{ success: boolean; data: Letter[] }> {
    return this.http.get<{ success: boolean; data: Letter[] }>(
      `${this.baseUrl}/get-supervisor-letters`
    );
  }

  /**
   * جلب قرار بالـ ID
   * Endpoint: GET /letters/get-letter/:id
   */
  getLetter(id: string): Observable<LetterDetail | null> {
    return this.http
      .get<{ success: boolean; data: LetterDetail }>(
        `${this.baseUrl}/get-letter/${id}`
      )
      .pipe(map((res) => res.data));
  }

  /**
   * تحديث حالة القرار من قبل المشرف
   * Endpoint: PUT /letters/update-status-supervisor/:id
   */
  updateStatusBySupervisor(
    id: string,
    status: string,
    reasonForRejection?: string,
    additionalData?: any
  ): Observable<LetterDetail> {
    const payload: any = { status };

    if (status === 'amendment' && reasonForRejection) {
      payload.reasonForRejection = reasonForRejection;
    }

    if (additionalData) {
      Object.assign(payload, additionalData);
    }

    return this.http
      .put<{ success: boolean; data: LetterDetail }>(
        `${this.baseUrl}/update-status-supervisor/${id}`,
        payload
      )
      .pipe(map((r) => r.data));
  }

  /**
   * تحديث حالة القرار من قبل رئيس الجامعة
   * Endpoint: PUT /letters/update-status-university-president/:id
   */
  updateStatusByUniversityPresident(
    id: string,
    status: string,
    reasonForRejection?: string,
    signatureType?: string,
    additionalData?: any
  ): Observable<LetterDetail> {
    const payload: any = { status };

    if (status === 'amendment' && reasonForRejection) {
      payload.reasonForRejection = reasonForRejection;
    }

    if (signatureType) {
      payload.signatureType = signatureType;
    }

    if (additionalData) {
      Object.assign(payload, additionalData);
    }

    return this.http
      .put<{ success: boolean; data: LetterDetail }>(
        `${this.baseUrl}/update-status-university-president/${id}`,
        payload
      )
      .pipe(map((r) => r.data));
  }

  /**
   * جلب القرارات المؤرشفة للمستخدم
   * Endpoint: GET /letters/get-user-archived-letters
   */
  getUserArchivedLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-user-archived-letters`
      )
      .pipe(map((r) => r.data));
  }

  /**
   * جلب جميع القرارات المؤرشفة
   * Endpoint: GET /letters/get-all-archived-letters
   */
  getAllArchivedLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-all-archived-letters`
      )
      .pipe(map((r) => r.data));
  }

  /**
   * جلب قرارات المشرف
   * Endpoint: GET /letters/get-supervisor-letters
   */
  getSupervisorLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-supervisor-letters`
      )
      .pipe(map((r) => r.data));
  }

  /**
   * جلب قرارات رئيس الجامعة
   * Endpoint: GET /letters/get-university-president-letters
   */
  getUniversityPresidentLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-university-president-letters`
      )
      .pipe(map((r) => r.data));
  }

  /**
   * جلب أرشيف المراجعين
   * Endpoint: GET /letters/get-reviewer-archives
   */
  getReviewerArchives(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-reviewer-archives`
      )
      .pipe(map((r) => r.data));
  }

  /**
   * إضافة قرار أرشيفي عام
   * Endpoint: POST /letters/add-archive
   */
  addArchiveGeneralLetter(formData: FormData): Observable<LetterDetail> {
    return this.http
      .post<{ success: boolean; data: LetterDetail }>(
        `${this.baseUrl}/add-archive`,
        formData
      )
      .pipe(map((r) => r.data));
  }

  /**
   * جلب القرارات المؤرشفة حسب النوع
   * Endpoint: GET /letters/get-archived/:type
   */
  getArchivedLettersByType(type: string): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-archived/${type}`
      )
      .pipe(map((r) => r.data));
  }

  /**
   * توليد PDF رسمي للقرار
   * Endpoint: GET /letters/generate-official-letter-pdf/:id
   */
  generateOfficialLetterPDF(id: string, signatureType?: string): Observable<{ pdfUrl: string }> {
    let url = `${this.baseUrl}/generate-official-letter-pdf/${id}`;
    if (signatureType) {
      url += `?signatureType=${encodeURIComponent(signatureType)}`;
    }
    return this.http
      .get<{ success: boolean; data: { pdfUrl: string } }>(url)
      .pipe(map((r) => r.data));
  }

  /**
   * طباعة القرار بنوع توقيع محدد
   * Endpoint: POST /letters/print-letter-by-type/:id
   */
  printLetterByType(id: string, signatureType: string): Observable<{ pdfUrl: string }> {
    return this.http
      .post<{ success: boolean; data: { pdfUrl: string } }>(
        `${this.baseUrl}/print-letter-by-type/${id}`,
        { signatureType }
      )
      .pipe(map((r) => r.data));
  }

  printTestingPdf(id: string): Observable<{ pdfUrl: string }> {
    return this.http
      .get<{ success: boolean; data: { pdfUrl: string } }>(
        `${this.baseUrl}/print-letter-testing/${id}`
      )
      .pipe(map(r => r.data));
  }

  cancelLetter(letterId: string): Observable<LetterDetail> {
    return this.http.put<LetterDetail>(`${this.baseUrl}/cancel-letter/${letterId}`, {
      status: 'canceled'
    });
  }

  getCanceledLetters(): Observable<LetterDetail[]> {
    return this.http.get<LetterDetail[]>(`${this.baseUrl}/get-canceled-letters`);
  }

  restoreLetter(letterId: string): Observable<LetterDetail> {
    return this.http.put<LetterDetail>(`${this.baseUrl}/restore-letter/${letterId}`, {
      status: 'restored'
    });
  }

  // تفاصيل قرار واحد
  getCancelledLetterById(id: string): Observable<LetterDetail> {
    return this.http.get<LetterDetail>(`${this.baseUrl}/get-canceled-letter/${id}`);
  }

  /**
   * عرض PDF
   * Endpoint: GET /letters/view-pdf/:filename
   */
  viewPDF(filename: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/view-pdf/${filename}`, {
      responseType: 'blob',
    });
  }

  /**
   * جلب جميع ملفات PDF
   * Endpoint: GET /letters/all-pdfs
   */
  getAllPDFs(): Observable<{ success: boolean; pdfFiles: PDFFile[] }> {
    return this.http.get<{ success: boolean; pdfFiles: PDFFile[] }>(
      `${this.baseUrl}/all-pdfs`
    );
  }

  /**
   * جلب PDF حسب معرف القرار
   * Endpoint: GET /letters/pdf-by-letter/:letterId
   */
  getPDFbyLetterId(letterId: string): Observable<{ success: boolean; pdfFile: PDFFile }> {
    return this.http.get<{ success: boolean; pdfFile: PDFFile }>(
      `${this.baseUrl}/pdf-by-letter/${letterId}`
    );
  }

  /**
   * تحميل ملف
   * Endpoint: GET /letters/download/:fileName
   */
  downloadFile(fileName: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/download/${fileName}`, {
      responseType: 'blob'
    });
  }

  /**
   * تحميل PDF
   */
  downloadPDF(filename: string, downloadName?: string): void {
    this.viewPDF(filename).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName || filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }

  getPDF(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  printTestingPdfFromData(letterData: FormData): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/print-testing-from-data`,
      letterData
    );
  }

  deleteLetter(letterId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete-letter/${letterId}`);
  }

  /**
   * فتح PDF في نافذة جديدة
   */
  openPDFInNewWindow(filename: string): void {
    this.viewPDF(filename).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  /**
   * جلب الإحصائيات
   * Endpoint: GET /letters/stats
   */
  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`);
  }

  /**
   * جلب إحصائيات الأرشيف
   * Endpoint: GET /letters/stats-archiv
   */
  getStatsArchiv(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats-archiv`);
  }

  /**
   * جلب القرارات الأخيرة
   * Endpoint: GET /letters/recent-letters
   */
  recentLetters(): Observable<{ success: boolean; activities: RecentActivit[] }> {
    return this.http.get<{ success: boolean; activities: RecentActivit[] }>(
      `${this.baseUrl}/recent-letters`
    );
  }

  /**
   * جلب القرارات المرفوضة (للتعديل)
   * Endpoint: GET /letters/get-all-rejected-letters
   */
  getRejectedLetters(): Observable<{ success: boolean; letters: LetterDetail[] }> {
    return this.http.get<{ success: boolean; letters: LetterDetail[] }>(
      `${this.baseUrl}/get-all-rejected-letters`
    );
  }

  /**
   * جلب قرار مرفوض بالـ ID
   * Endpoint: GET /letters/get-rejected-letters/:id
   */
  getLetterById(id: string): Observable<{ success: boolean; letter: LetterDetail; rejectedBy?: any }> {
    return this.http.get<{ success: boolean; letter: LetterDetail; rejectedBy?: any }>(
      `${this.baseUrl}/get-rejected-letters/${id}`
    );
  }

  /**
   * تحديث PDF الممسوح ضوئياً
   * Endpoint: PUT /letters/update-real-scan-pdf/:id
   */
  updateRealScanPdf(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/update-real-scan-pdf/${id}`, formData);
  }

  // ==================== Helper Methods ====================

  /**
   * التحقق من إمكانية تحديث الحالة
   */
  canUpdateStatus(userRole: string, currentStatus: string): boolean {
    const statusPermissions = {
      supervisor: ['in_progress'],
      UniversityPresident: ['pending'],
    };

    return (
      statusPermissions[userRole as keyof typeof statusPermissions]?.includes(
        currentStatus
      ) || false
    );
  }

  /**
   * الحصول على الحالة بالعربية
   */
  getStatusArabic(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'قيد الانتظار',
      approved: 'مقبول',
      rejected: 'مرفوض',
      in_progress: 'قيد المعالجة',
      amendment: 'بحاجة للتعديل',
      testing: 'تجريبي',
      canceled: 'ملغى'
    };
    return statusMap[status] || status;
  }

  /**
   * الحصول على نوع التوقيع بالعربية
   */
  getSignatureTypeArabic(signatureType: string): string {
    const signatureMap: { [key: string]: string } = {
      'الممسوحة ضوئيا': 'الممسوحة ضوئياً',
      'حقيقية': 'حقيقية',
    };
    return signatureMap[signatureType] || signatureType;
  }
}
