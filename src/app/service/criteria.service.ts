import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginService } from './login.service';
import { MainCriteria, SubCriteria } from '../model/criteria';
import { map } from 'rxjs/operators';

export interface AddMainCriteriaRequest {
  name: string;
  sector?: string[];
  departmentUser?: string;
}

export interface Department {
  _id: string;
  fullname: string;
  username: string;
  sector?: string[];
  sectorId?: string;
  sectorInfo?: {
    _id: string;
    name: string;
  };
}

export interface Sector {
  _id: string;
  name: string;
}

export interface AddSubCriteriaRequest {
  name: string;
  mainCriteria: string;
}

export interface ReviewerAssignment {
  _id: string;
  sector: any[];
  mainCriteria: string | MainCriteria;
  subCriteria: string | SubCriteria;
  supervisor: any;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CriteriaService {
  // 🔥 Base URLs - تأكد من أن الـ base URL صحيح
  private apiUrl = 'http://localhost:3000/criteria';
  private usersUrl = 'http://localhost:3000/users';
  private reviewerUrl = 'http://localhost:3000/reviewer'; // للـ reviewer assignments

  constructor(private http: HttpClient, private loginService: LoginService) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `${token}`,
    });
  }

  // ==================== Main Criteria Methods ====================
  
  /**
   * إضافة معيار رئيسي جديد
   */
  addMainCriteria(criteriaData: AddMainCriteriaRequest): Observable<MainCriteria> {
    return this.http.post<MainCriteria>(
      `${this.apiUrl}/add-main-criteria`,
      criteriaData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * جلب جميع المعايير الرئيسية
   * Endpoint: GET /criteria/all-main-criteria
   */
getAllMainCriteria(): Observable<MainCriteria[]> {
  return this.http.get<{ success: boolean; data: MainCriteria[] }>(
    `${this.apiUrl}/all-main-criteria`,
    { headers: this.getAuthHeaders() }
  ).pipe(
    map(response => {
      // 👇 استخراج الـ data من الـ response
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }
      // في حالة Response بدون data wrapper
      if (Array.isArray(response)) {
        return response as any;
      }
      console.warn('Invalid main criteria response:', response);
      return [];
    })
  );
}

  /**
   * جلب معيار رئيسي بالـ ID
   * Endpoint: GET /criteria/main-criteria/:id
   */
  getMainCriteriaById(id: string): Observable<MainCriteria> {
    return this.http.get<MainCriteria>(
      `${this.apiUrl}/main-criteria/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * جلب المعايير الرئيسية حسب القطاع
   * Endpoint: GET /criteria/main-criteria/sector/:sectorId
   */
  getMainCriteriaBySector(sectorId: string): Observable<MainCriteria[]> {
    return this.http.get<MainCriteria[]>(
      `${this.reviewerUrl}/main-criteria/sector/${sectorId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * تحديث معيار رئيسي
   */
  updateMainCriteriaPartial(updateData: any): Observable<MainCriteria> {
    const id = updateData.id;
    return this.http.put<MainCriteria>(
      `${this.apiUrl}/update-main-criteria/${id}`,
      updateData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * حذف معيار رئيسي
   */
  deleteMainCriteria(id: string): Observable<MainCriteria> {
    return this.http.delete<MainCriteria>(
      `${this.apiUrl}/delete-main-criteria/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ==================== Sub Criteria Methods ====================

  /**
   * إضافة معيار فرعي جديد
   */
  addSubCriteria(subCriteriaData: AddSubCriteriaRequest): Observable<SubCriteria> {
    return this.http.post<SubCriteria>(
      `${this.apiUrl}/add-sub-criteria`,
      subCriteriaData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * جلب جميع المعايير الفرعية
   * Endpoint: GET /criteria/sub-criteria
   */
 getAllSubCriteria(): Observable<SubCriteria[]> {
  return this.http.get<{ success: boolean; data: SubCriteria[] }>(
    `${this.reviewerUrl}/sub-criteria`,
    { headers: this.getAuthHeaders() }
  ).pipe(
    map(response => {
      // 👇 استخراج الـ data من الـ response
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }
      // في حالة الفشل، إرجاع array فارغ
      console.warn('Invalid sub criteria response:', response);
      return [];
    })
  );
}

  /**
   * جلب معيار فرعي بالـ ID
   * Endpoint: GET /criteria/sub-criteria/:id
   */
getSubCriteriaById(mainCriteriaId: string): Observable<SubCriteria[]> {
  return this.http.get<{ success: boolean; data: SubCriteria[] }>(
    `${this.apiUrl}/get-sub-criteria-by-main/${mainCriteriaId}`,
    { headers: this.getAuthHeaders() }
  ).pipe(
    map(response => {
      // استخراج الـ data من الـ response
      if (response && response.success && Array.isArray(response.data)) {
        return response.data;
      }
      // في حالة الفشل أو البيانات غير صحيحة، إرجاع array فارغ
      console.warn('Invalid response structure:', response);
      return [];
    })
  );
}



  /**
   * جلب المعايير الفرعية حسب المعيار الرئيسي
   * Endpoint: GET /criteria/sub-criteria/main/:mainCriteriaId
   * 🔥 هذا هو الـ endpoint الصحيح للاستخدام في الفورم
   */
  getSubCriteriaByMainId(mainCriteriaId: string): Observable<SubCriteria[]> {
    return this.http.get<SubCriteria[]>(
      `${this.reviewerUrl}/sub-criteria/main/${mainCriteriaId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * تحديث معيار فرعي
   */
  updateSubCriteria(id: string, name: string): Observable<SubCriteria> {
    return this.http.put<SubCriteria>(
      `${this.apiUrl}/update-sub-criteria/${id}`,
      { name },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * حذف معيار فرعي
   */
  deleteSubCriteria(id: string): Observable<SubCriteria> {
    return this.http.delete<SubCriteria>(
      `${this.apiUrl}/delete-sub-criteria/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ==================== Reviewer Assignment Methods ====================

  /**
   * جلب جميع تعيينات المراجعين
   * Endpoint: GET /criteria/reviewer-assignments
   */
  getAllReviewerAssignments(): Observable<ReviewerAssignment[]> {
    return this.http.get<{ success: boolean; data: ReviewerAssignment[] }>(
      `${this.reviewerUrl}/reviewer-assignments`,
      { headers: this.getAuthHeaders() }
    ).pipe(map(res => res.data));
  }

  /**
   * جلب تعيين مراجع بالـ ID
   * Endpoint: GET /criteria/reviewer-assignment/:id
   */
  getReviewerAssignmentById(id: string): Observable<ReviewerAssignment> {
    return this.http.get<{ success: boolean; data: ReviewerAssignment }>(
      `${this.reviewerUrl}/reviewer-assignment/${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(map(res => res.data));
  }

  /**
   * إنشاء تعيين مراجع جديد
   * Endpoint: POST /criteria/create-reviewer-assignment
   */
  createReviewerAssignment(assignmentData: any): Observable<ReviewerAssignment> {
    return this.http.post<{ success: boolean; data: ReviewerAssignment }>(
      `${this.reviewerUrl}/create-reviewer-assignment`,
      assignmentData,
      { headers: this.getAuthHeaders() }
    ).pipe(map(res => res.data));
  }

  /**
   * تحديث تعيين مراجع
   * Endpoint: PUT /criteria/update-reviewer-assignment/:id
   */
  updateReviewerAssignment(id: string, assignmentData: any): Observable<ReviewerAssignment> {
    return this.http.put<{ success: boolean; data: ReviewerAssignment }>(
      `${this.reviewerUrl}/update-reviewer-assignment/${id}`,
      assignmentData,
      { headers: this.getAuthHeaders() }
    ).pipe(map(res => res.data));
  }

  /**
   * حذف تعيين مراجع
   * Endpoint: DELETE /criteria/delete-reviewer-assignment/:id
   */
  deleteReviewerAssignment(id: string): Observable<any> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.reviewerUrl}/delete-reviewer-assignment/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // ==================== Helper Methods ====================

  /**
   * جلب جميع الأقسام/المستخدمين
   */
  getAllDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(
      `${this.usersUrl}/all-users`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * جلب جميع القطاعات
   */
  getAllSectors(): Observable<{ success: boolean; data: Sector[] }> {
    return this.http.get<{ success: boolean; data: Sector[] }>(
      `${this.usersUrl}/all-sectors`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * جلب الأقسام حسب القطاع
   */
  getDepartmentsBySector(sectorId: string): Observable<Department[]> {
    return this.http.get<Department[]>(
      `${this.usersUrl}/departments-by-sector/${sectorId}`,
      { headers: this.getAuthHeaders() }
    );
  }
}