import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DecisioService {
  private baseUrl = "http://localhost:3000/reviewer"; // أو أي baseUrl تستخدمه
  private baseUrl2 = "http://localhost:3000/criteria"; // أو أي baseUrl تستخدمه
  constructor(private http: HttpClient) { }

  /**
   * إنشاء headers مع token
   */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token'); // أو sessionStorage
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // ==================== Reviewer Assignment APIs ====================

  /**
   * الحصول على جميع تعيينات المراجعين
   */
  getReviewerAssignments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/reviewer-assignments`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * الحصول على تعيين مراجع معين بالـ ID
   */
  getReviewerAssignmentById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/reviewer-assignments/${id}`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * إضافة تعيين مراجع جديد
   */
  addReviewerAssignment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create-reviewer-assignment`, data, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * تحديث تعيين مراجع
   */
  updateReviewerAssignment(id: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/update-reviewer-assignment/${id}`, data, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * حذف تعيين مراجع
   */
  deleteReviewerAssignment(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete-reviewer-assignment/${id}`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * الحصول على تعيينات المراجعين حسب القطاع
   */
  getReviewerAssignmentsBySector(sectorId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/reviewer-assignments/sector/${sectorId}`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * الحصول على تعيينات مراجع معين
   */
  getAssignmentsBySupervisor(supervisorId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/reviewer-assignments/supervisor/${supervisorId}`, { 
      headers: this.getHeaders() 
    });
  }

  // ==================== Main Criteria APIs ====================

  /**
   * الحصول على جميع المعايير الرئيسية
   */
  getAllMainCriteria(): Observable<any> {
    return this.http.get(`${this.baseUrl}/main-criteria`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * الحصول على المعايير الرئيسية حسب القطاع
   */
  getMainCriteriaBySector(sectorId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/main-criteria/sector/${sectorId}`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * الحصول على معيار رئيسي بالـ ID
   */
  getMainCriteriaById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/main-criteria/${id}`, { 
      headers: this.getHeaders() 
    });
  }

  // ==================== Sub Criteria APIs ====================

  /**
   * الحصول على جميع المعايير الفرعية
   */
  getAllSubCriteria(): Observable<any> {
    return this.http.get(`${this.baseUrl}/sub-criteria`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * الحصول على المعايير الفرعية حسب المعيار الرئيسي
   */
  getSubCriteriaByMainCriteria(mainCriteriaId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/sub-criteria/main/${mainCriteriaId}`, { 
      headers: this.getHeaders() 
    });
  }

  /**
   * الحصول على معيار فرعي بالـ ID
   */
  getSubCriteriaById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/sub-criteria/${id}`, { 
      headers: this.getHeaders() 
    });
  }
}