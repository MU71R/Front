// department-criteria-management.component.ts
import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../service/login.service';
import Swal from 'sweetalert2';
import { MainCriteria } from 'src/app/model/criteria';
import { CriteriaService } from '../../service/criteria.service';
import { SubCriteria } from 'src/app/model/criteria';
import { Sector } from 'src/app/model/criteria';

@Component({
  selector: 'app-department-criteria-management',
  templateUrl: './department-criteria-management.component.html',
  styleUrls: ['./department-criteria-management.component.css'],
})
export class DepartmentCriteriaManagementComponent implements OnInit {
  mainCriteriaList: MainCriteria[] = [];
  subCriteriaList: SubCriteria[] = [];
  sectorsList: Sector[] = [];
  expandedCriteria = new Set<string>();
  isLoading = false;
  isSubmitting = false;

  isMainModalOpen = false;
  editingMain: MainCriteria | null = null;
  mainName = '';
  selectedMainSectors: string[] = [];

  isSubModalOpen = false;
  editingSub: SubCriteria | null = null;
  subName = '';
  subMainId = '';
  selectedSubSectors: string[] = [];

  constructor(
    private criteriaService: CriteriaService, 
    private loginService: LoginService
  ) { }

  ngOnInit(): void {
    if (!this.loginService.getTokenFromLocalStorage()) {
      Swal.fire({ 
        title: 'تنبيه', 
        text: 'يجب تسجيل الدخول أولاً', 
        icon: 'warning', 
        confirmButtonText: 'حسناً' 
      });
      return;
    }
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading = true;

    // تحميل القطاعات أولًا
    this.criteriaService.getAllSectors().subscribe({
      next: (res: any) => {
        this.sectorsList = res.data.map((s: any) => ({ 
          _id: s._id, 
          name: s.sector 
        }));
      },
      error: (err) => console.error('Error loading sectors:', err)
    });

    // تحميل المعايير الرئيسية
    this.criteriaService.getAllMainCriteria().subscribe({
  next: (data) => { 
    // console.log('Main Criteria Data:', data); // 👈 أضف هذا السطر
    this.mainCriteriaList = data; 
    this.isLoading = false; 
  },
  error: (err) => { 
    console.error('Error loading main criteria:', err); 
    this.isLoading = false; 
  }
});

    // تحميل المعايير الفرعية
    this.criteriaService.getAllSubCriteria().subscribe({
      next: (data) => { 
        this.subCriteriaList = data; 
      },
      error: (err) => { 
        console.error('Error loading sub criteria:', err); 
      }
    });
  }

  toggleExpanded(id?: string): void {
    if (!id) return;
    if (this.expandedCriteria.has(id)) {
      this.expandedCriteria.delete(id);
    } else {
      this.expandedCriteria.add(id);
    }
  }

  getSubForMain(mainId?: string): SubCriteria[] {
    if (!mainId) return [];
    return this.subCriteriaList.filter(sub => {
      const mainIdInSub = typeof sub.mainCriteria === 'string'
        ? sub.mainCriteria
        : sub.mainCriteria?._id;

      return mainIdInSub === mainId;
    });
  }

  getMainById(id: string): MainCriteria | undefined {
    return this.mainCriteriaList.find(main => main._id === id);
  }

  openMainModal(edit?: MainCriteria): void {
    if (edit) {
      this.editingMain = { ...edit };
      this.mainName = edit.name;

      // استخراج IDs القطاعات
      this.selectedMainSectors = (edit.sector || []).map((s: any) => 
        typeof s === 'string' ? s : s._id
      );
    } else {
      this.editingMain = null;
      this.mainName = '';
      this.selectedMainSectors = [];
    }
    this.isMainModalOpen = true;
  }

  closeMainModal(): void {
    this.isMainModalOpen = false;
    this.editingMain = null;
    this.mainName = '';
    this.selectedMainSectors = [];
  }

  submitMain(): void {
    const name = this.mainName.trim();
    
    if (!name || this.selectedMainSectors.length === 0) {
      Swal.fire({ 
        title: 'تنبيه', 
        text: 'الاسم والقطاعات مطلوبة', 
        icon: 'warning', 
        confirmButtonText: 'حسناً' 
      });
      return;
    }

    this.isSubmitting = true;
    const data: any = { 
      name, 
      sector: this.selectedMainSectors 
    };

    if (this.editingMain) {
      data.id = this.editingMain._id;
      this.criteriaService.updateMainCriteriaPartial(data).subscribe({
        next: (updated) => {
          const idx = this.mainCriteriaList.findIndex((m) => m._id === updated._id);
          if (idx !== -1) {
            this.mainCriteriaList[idx] = updated;
          }
          Swal.fire({ 
            title: 'نجاح', 
            text: 'تم تحديث المعيار الرئيسي بنجاح', 
            icon: 'success', 
            confirmButtonText: 'حسناً' 
          });
          this.closeMainModal(); 
          this.isSubmitting = false;
        },
        error: (err) => { 
          console.error('Error updating main criteria:', err);
          Swal.fire({ 
            title: 'خطأ', 
            text: err.error?.error || 'حدث خطأ أثناء التحديث', 
            icon: 'error', 
            confirmButtonText: 'حسناً' 
          });
          this.isSubmitting = false; 
        }
      });
    } else {
      this.criteriaService.addMainCriteria(data).subscribe({
        next: (created) => {
          this.mainCriteriaList.push(created);
          Swal.fire({ 
            title: 'نجاح', 
            text: 'تم إضافة المعيار الرئيسي بنجاح', 
            icon: 'success', 
            confirmButtonText: 'حسناً' 
          });
          this.closeMainModal(); 
          this.isSubmitting = false;
        },
        error: (err) => { 
          console.error('Error adding main criteria:', err);
          Swal.fire({ 
            title: 'خطأ', 
            text: err.error?.error || 'حدث خطأ أثناء الإضافة', 
            icon: 'error', 
            confirmButtonText: 'حسناً' 
          });
          this.isSubmitting = false; 
        }
      });
    }
  }

  openSubModal(mainId: string, edit?: SubCriteria): void {
    if (edit) {
      this.editingSub = { ...edit };
      this.subName = edit.name;
      this.subMainId = typeof edit.mainCriteria === 'string' 
        ? edit.mainCriteria 
        : edit.mainCriteria._id || '';

      // استخراج القطاعات المرتبطة بالمعيار الفرعي
      this.selectedSubSectors = (edit.sector || []).map((s: any) => 
        typeof s === 'string' ? s : s._id
      );
    } else {
      this.editingSub = null;
      this.subName = '';
      this.subMainId = mainId;
      
      // الحصول على قطاعات المعيار الرئيسي كقيم افتراضية
      const main = this.getMainById(mainId);
      this.selectedSubSectors = (main?.sector || []).map((s: any) => 
        typeof s === 'string' ? s : s._id
      );
    }
    this.isSubModalOpen = true;
  }

  closeSubModal(): void {
    this.isSubModalOpen = false;
    this.editingSub = null;
    this.subName = '';
    this.subMainId = '';
    this.selectedSubSectors = [];
  }

  getCurrentMainCriteriaName(): string {
    const main = this.getMainById(this.subMainId);
    return main?.name || 'غير معروف';
  }

  submitSub(): void {
    const name = this.subName.trim();
    
    if (!name) { 
      Swal.fire({ 
        title: 'تنبيه', 
        text: 'يرجى إدخال اسم المعيار الفرعي', 
        icon: 'warning', 
        confirmButtonText: 'حسناً' 
      }); 
      return; 
    }

    this.isSubmitting = true;
    const data: any = { 
      name, 
      mainCriteria: this.subMainId, 
      sector: this.selectedSubSectors 
    };

    if (this.editingSub) {
      this.criteriaService.updateSubCriteria(this.editingSub._id, data).subscribe({
        next: (updated) => {
          const idx = this.subCriteriaList.findIndex((s) => s._id === updated._id);
          if (idx !== -1) {
            this.subCriteriaList[idx] = updated;
          }
          Swal.fire({ 
            title: 'نجاح', 
            text: 'تم تحديث المعيار الفرعي بنجاح', 
            icon: 'success', 
            confirmButtonText: 'حسناً' 
          });
          this.closeSubModal(); 
          this.isSubmitting = false;
        },
        error: (err) => { 
          console.error('Error updating sub criteria:', err);
          Swal.fire({ 
            title: 'خطأ', 
            text: err.error?.error || 'حدث خطأ أثناء التحديث', 
            icon: 'error', 
            confirmButtonText: 'حسناً' 
          });
          this.isSubmitting = false; 
        }
      });
    } else {
      this.criteriaService.addSubCriteria(data).subscribe({
        next: (created) => {
          this.subCriteriaList.push(created);
          Swal.fire({ 
            title: 'نجاح', 
            text: 'تم إضافة المعيار الفرعي بنجاح', 
            icon: 'success', 
            confirmButtonText: 'حسناً' 
          });
          this.closeSubModal(); 
          this.isSubmitting = false;
        },
        error: (err) => { 
          console.error('Error adding sub criteria:', err);
          Swal.fire({ 
            title: 'خطأ', 
            text: err.error?.error || 'حدث خطأ أثناء الإضافة', 
            icon: 'error', 
            confirmButtonText: 'حسناً' 
          });
          this.isSubmitting = false; 
        }
      });
    }
  }

  requestDeleteMain(id: string): void {
    // التحقق من وجود معايير فرعية مرتبطة
    const used = this.subCriteriaList.some(sub => {
      const mainId = typeof sub.mainCriteria === 'string' 
        ? sub.mainCriteria 
        : sub.mainCriteria?._id;
      return mainId === id;
    });

    if (used) {
      Swal.fire({ 
        title: 'تنبيه', 
        text: 'لا يمكن حذف المعيار الرئيسي لأنه مرتبط بمعايير فرعية', 
        icon: 'warning', 
        confirmButtonText: 'حسناً' 
      });
      return;
    }

    Swal.fire({
      title: 'تأكيد الحذف',
      text: 'هل تريد حذف المعيار الرئيسي؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء'
    }).then(res => {
      if (res.isConfirmed) {
        this.criteriaService.deleteMainCriteria(id).subscribe({
          next: () => {
            this.mainCriteriaList = this.mainCriteriaList.filter((m) => m._id !== id);
            Swal.fire('تم الحذف', '', 'success');
          },
          error: (err) => {
            console.error('Error deleting main criteria:', err);
            Swal.fire({ 
              title: 'خطأ', 
              text: 'حدث خطأ أثناء الحذف', 
              icon: 'error', 
              confirmButtonText: 'حسناً' 
            });
          }
        });
      }
    });
  }

  requestDeleteSub(id: string): void {
    Swal.fire({
      title: 'تأكيد الحذف',
      text: 'هل تريد حذف المعيار الفرعي؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء'
    }).then(res => {
      if (res.isConfirmed) {
        this.criteriaService.deleteSubCriteria(id).subscribe({
          next: () => {
            this.subCriteriaList = this.subCriteriaList.filter((s) => s._id !== id);
            Swal.fire('تم الحذف', '', 'success');
          },
          error: (err) => {
            console.error('Error deleting sub criteria:', err);
            Swal.fire({ 
              title: 'خطأ', 
              text: 'حدث خطأ أثناء الحذف', 
              icon: 'error', 
              confirmButtonText: 'حسناً' 
            });
          }
        });
      }
    });
  }
}