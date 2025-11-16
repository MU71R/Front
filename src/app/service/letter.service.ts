import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Letter } from '../model/Letter';
import { map } from 'rxjs/operators';
import { LetterDetail, RecentActivit } from '../model/letter-detail';
import { RecentActivity } from './home.service';

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

@Injectable({
  providedIn: 'root',
})
export class LetterService {
  baseUrl = 'http://localhost:3000/letters';

  constructor(private http: HttpClient) {}

  addLetterType(payload: Letter) {
    return this.http.post<Letter>(`${this.baseUrl}/add-letter`, payload);
  }

  deleteLetterType(id: string) {
    return this.http.delete<Letter>(`${this.baseUrl}/delete-letter/${id}`);
  }

  updateLetter(id: string, payload: Partial<LetterDetail>) {
    return this.http
      .put<{ success: boolean; data: LetterDetail }>(
        `${this.baseUrl}/update-letter/${id}`,
        payload
      )
      .pipe(map((r) => r.data));
  }

  getLetterTypes() {
    return this.http.get<Letter[]>(`${this.baseUrl}/all-letters`);
  }

  getLetterSupervisor() {
    return this.http.get<Letter[]>(`${this.baseUrl}/get-supervisor-letters`);
  }
  getLetter(id: string): Observable<LetterDetail | null> {
    return this.http
      .get<{ success: boolean; data: LetterDetail }>(
        `${this.baseUrl}/get-letter/${id}`
      )
      .pipe(map((res) => res.data));
  }

  // التحديث: دعم إرسال البيانات الإضافية مع الرفض
  updateStatusBySupervisor(
    id: string,
    status: string,
    reasonForRejection?: string,
    additionalData?: any
  ): Observable<LetterDetail> {
    const payload: any = { status };

    if (status === 'rejected' && reasonForRejection) {
      payload.reasonForRejection = reasonForRejection;
    }

    // دمج البيانات الإضافية إذا وجدت
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

  // التحديث: دعم إرسال البيانات الإضافية مع الرفض
  updateStatusByUniversityPresident(
    id: string,
    status: string,
    reasonForRejection?: string,
    additionalData?: any
  ): Observable<LetterDetail> {
    const payload: any = { status };

    if (status === 'rejected' && reasonForRejection) {
      payload.reasonForRejection = reasonForRejection;
    }

    // دمج البيانات الإضافية إذا وجدت
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

  getUserArchivedLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-user-archived-letters`
      )
      .pipe(map((r) => r.data));
  }

  getAllArchivedLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-all-archived-letters`
      )
      .pipe(map((r) => r.data));
  }

  getSupervisorLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-supervisor-letters`
      )
      .pipe(map((r) => r.data));
  }

  getUniversityPresidentLetters(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-university-president-letters`
      )
      .pipe(map((r) => r.data));
  }

  getReviewerArchives(): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-reviewer-archives`
      )
      .pipe(map((r) => r.data));
  }

  addArchiveGeneralLetter(formData: FormData): Observable<LetterDetail> {
    return this.http
      .post<{ success: boolean; data: LetterDetail }>(
        `${this.baseUrl}/add-archive`,
        formData
      )
      .pipe(map((r) => r.data));
  }

  getArchivedLettersByType(type: string): Observable<LetterDetail[]> {
    return this.http
      .get<{ success: boolean; data: LetterDetail[] }>(
        `${this.baseUrl}/get-archived/${type}`
      )
      .pipe(map((r) => r.data));
  }

  generateOfficialLetterPDF(id: string): Observable<{ pdfUrl: string }> {
    return this.http
      .get<{ success: boolean; data: { pdfUrl: string } }>(
        `${this.baseUrl}/generate-official-letter-pdf/${id}`
      )
      .pipe(map((r) => r.data));
  }

  printLetterByType(
    id: string,
    signatureType: string
  ): Observable<{ pdfUrl: string }> {
    return this.http
      .post<{ success: boolean; data: { pdfUrl: string } }>(
        `${this.baseUrl}/print-letter-by-type/${id}`,
        { signatureType }
      )
      .pipe(map((r) => r.data));
  }

  viewPDF(filename: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/view-pdf/${filename}`, {
      responseType: 'blob',
    });
  }

  getAllPDFs(): Observable<{ success: boolean; pdfFiles: PDFFile[] }> {
    return this.http.get<{ success: boolean; pdfFiles: PDFFile[] }>(
      `${this.baseUrl}/all-pdfs`
    );
  }

  getPDFbyLetterId(
    letterId: string
  ): Observable<{ success: boolean; pdfFile: PDFFile }> {
    return this.http.get<{ success: boolean; pdfFile: PDFFile }>(
      `${this.baseUrl}/pdf-by-letter/${letterId}`
    );
  }

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

  openPDFInNewWindow(filename: string): void {
    this.viewPDF(filename).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

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

  getStatusArabic(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'قيد الانتظار',
      approved: 'مقبول',
      rejected: 'مرفوض',
      in_progress: 'قيد المعالجة',
    };
    return statusMap[status] || status;
  }

  getSignatureTypeArabic(signatureType: string): string {
    const signatureMap: { [key: string]: string } = {
      'الممسوحة ضوئيا': 'الممسوحة ضوئياً',
      حقيقية: 'حقيقية',
    };
    return signatureMap[signatureType] || signatureType;
  }

  recentLetters(): Observable<{ success: boolean; activities: RecentActivit[] }> {
    return this.http.get<{ success: boolean; activities: RecentActivit[] }>(
      `${this.baseUrl}/recent-letters`
    );
  }

  getRejectedLetters(): Observable<{ success: boolean; letters: LetterDetail[] }> {
    return this.http.get<{ success: boolean; letters: LetterDetail[] }>(
      `${this.baseUrl}/get-all-rejected-letters`
    );
  }
  getLetterById(id: string): Observable<LetterDetail | null> {
    return this.http.get<LetterDetail | null>(`${this.baseUrl}/get-rejected-letters/${id}`);
  }

}
