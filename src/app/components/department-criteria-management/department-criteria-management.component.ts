import { Component, OnInit } from '@angular/core';
import { CriteriaService, SubCriteria, Sector } from '../../service/criteria.service';
import { LoginService } from '../../service/login.service';
import Swal from 'sweetalert2';
import { MainCriteria } from 'src/app/model/criteria';

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

  constructor(private criteriaService: CriteriaService, private loginService: LoginService) { }

  ngOnInit(): void {
    if (!this.loginService.getTokenFromLocalStorage()) {
      Swal.fire({ title: 'تنبيه', text: 'يجب تسجيل الدخول أولاً', icon: 'warning', confirmButtonText: 'حسناً' });
      return;
    }
    this.loadAllData();
  }

  loadAllData(): void {
  this.isLoading = true;

  // تحميل القطاعات أولًا
  this.criteriaService.getAllSectors().subscribe({
    next: (res: any) => {
      this.sectorsList = res.data.map((s: any) => ({ _id: s._id, name: s.sector }));
    },
    error: (err) => console.error(err)
  });

  // تحميل المعايير الرئيسية
  this.criteriaService.getAllMainCriteria().subscribe({
    next: (data) => { this.mainCriteriaList = data; this.isLoading = false; },
    error: (err) => { console.error(err); this.isLoading = false; }
  });

  // تحميل المعايير الفرعية
  this.criteriaService.getAllSubCriteria().subscribe({
    next: (data) => { this.subCriteriaList = data; },
    error: (err) => { console.error(err); }
  });
}

  toggleExpanded(id?: string) {
    if (!id) return;
    if (this.expandedCriteria.has(id)) this.expandedCriteria.delete(id);
    else this.expandedCriteria.add(id);
  }

  getSubForMain(mainId?: string) {
    if (!mainId) return [];
    return this.subCriteriaList.filter(sub => sub.mainCriteria === mainId);
  }

  getMainById(id: string): MainCriteria | undefined {
    return this.mainCriteriaList.find(main => main._id === id);
  }

  openMainModal(edit?: MainCriteria) {
  if (edit) {
    this.editingMain = { ...edit };
    this.mainName = edit.name;

    // لو edit.sector عبارة عن Array of Objects أو Array of IDs
    this.selectedMainSectors = (edit.sector || []).map((s: any) => s._id || s);

  } else {
    this.editingMain = null;
    this.mainName = '';
    this.selectedMainSectors = [];
  }
  this.isMainModalOpen = true;
}

  closeMainModal() {
    this.isMainModalOpen = false;
    this.editingMain = null;
    this.mainName = '';
    this.selectedMainSectors = [];
  }

  submitMain() {
    const name = this.mainName.trim();
    if (!name || this.selectedMainSectors.length === 0) {
      Swal.fire({ title: 'تنبيه', text: 'الاسم والقطاعات مطلوبة', icon: 'warning', confirmButtonText: 'حسناً' });
      return;
    }
    this.isSubmitting = true;
    const data: any = { name, sector: this.selectedMainSectors };

    if (this.editingMain) {
      data.id = this.editingMain._id;
      this.criteriaService.updateMainCriteriaPartial(data).subscribe({
        next: (updated) => {
          const idx = this.mainCriteriaList.findIndex((m) => m._id === updated._id);
          this.mainCriteriaList[idx] = updated;
          Swal.fire({ title: 'نجاح', text: 'تم تحديث المعيار الرئيسي بنجاح', icon: 'success', confirmButtonText: 'حسناً' });
          this.closeMainModal(); this.isSubmitting = false;
        },
        error: (err) => { console.error(err); this.isSubmitting = false; }
      });
    } else {
      this.criteriaService.addMainCriteria(data).subscribe({
        next: (created) => {
          this.mainCriteriaList.push(created);
          Swal.fire({ title: 'نجاح', text: 'تم إضافة المعيار الرئيسي بنجاح', icon: 'success', confirmButtonText: 'حسناً' });
          this.closeMainModal(); this.isSubmitting = false;
        },
        error: (err) => { console.error(err); this.isSubmitting = false; }
      });
    }
  }

  openSubModal(mainId: string, edit?: SubCriteria) {
  if (edit) {
    this.editingSub = { ...edit };
    this.subName = edit.name;
    this.subMainId = typeof edit.mainCriteria === 'string' ? edit.mainCriteria : edit.mainCriteria._id || '';

    // القطاعات المرتبطة بالمعيار الفرعي تأتي من المعيار الرئيسي
    const main = this.getMainById(this.subMainId);
    this.selectedSubSectors = main?.sector?.map((s: any) => s._id || s) || [];

  } else {
    this.editingSub = null;
    this.subName = '';
    this.subMainId = mainId;
    this.selectedSubSectors = [];
  }
  this.isSubModalOpen = true;
}

  closeSubModal() {
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

  submitSub() {
    const name = this.subName.trim();
    if (!name) { Swal.fire({ title: 'تنبيه', text: 'يرجى إدخال اسم المعيار الفرعي', icon: 'warning', confirmButtonText: 'حسناً' }); return; }
    this.isSubmitting = true;
    const data: any = { name, mainCriteria: this.subMainId, sector: this.selectedSubSectors };

    if (this.editingSub) {
      this.criteriaService.updateSubCriteria(this.editingSub._id, data).subscribe({
        next: (updated) => {
          const idx = this.subCriteriaList.findIndex((s) => s._id === updated._id);
          this.subCriteriaList[idx] = updated;
          Swal.fire({ title: 'نجاح', text: 'تم تحديث المعيار الفرعي بنجاح', icon: 'success', confirmButtonText: 'حسناً' });
          this.closeSubModal(); this.isSubmitting = false;
        },
        error: (err) => { console.error(err); this.isSubmitting = false; }
      });
    } else {
      this.criteriaService.addSubCriteria(data).subscribe({
        next: (created) => {
          this.subCriteriaList.push(created);
          Swal.fire({ title: 'نجاح', text: 'تم إضافة المعيار الفرعي بنجاح', icon: 'success', confirmButtonText: 'حسناً' });
          this.closeSubModal(); this.isSubmitting = false;
        },
        error: (err) => { console.error(err); this.isSubmitting = false; }
      });
    }
  }

  requestDeleteMain(id: string) {
    const used = this.subCriteriaList.some(s => s.mainCriteria === id);
    if (used) {
      Swal.fire({ title: 'تنبيه', text: 'لا يمكن حذف المعيار الرئيسي لأنه مرتبط بمعايير فرعية', icon: 'warning', confirmButtonText: 'حسناً' });
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
          error: (err) => console.error(err)
        });
      }
    });
  }

  requestDeleteSub(id: string) {
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
          error: (err) => console.error(err)
        });
      }
    });
  }
}
