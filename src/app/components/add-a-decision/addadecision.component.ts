import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MainCriteria, SubCriteria, ReviewerAssignment, Sector } from 'src/app/model/decisio';
import { DecisioService } from 'src/app/service/decisio.service';
import { AdministrationService } from 'src/app/service/user.service';
import Swal from 'sweetalert2';
import { User } from 'src/app/model/user';

@Component({
  selector: 'app-addadecision',
  templateUrl: './addadecision.component.html',
  styleUrls: ['./addadecision.component.css'],
})
export class AddadecisionComponent implements OnInit {
  showFormModal = false;
  editingId: string | null = null;
  loading = true;
  loadingMainCriteria = false;
  loadingSubCriteria = false;
  loadingReviewers = false;
  formSubmitted = false;

  form: any = {
    sector: null,
    mainCriteria: null,
    subCriteria: null,
    supervisor: null
  };

  sectors: Sector[] = [];
  mainCriteriaList: MainCriteria[] = [];
  subCriteriaList: SubCriteria[] = [];
  reviewers: User[] = [];
  reviewerAssignments: ReviewerAssignment[] = [];

  allMainCriteria: MainCriteria[] = [];
  allSubCriteria: SubCriteria[] = [];
  allReviewers: User[] = [];

  constructor(
    private decisionService: DecisioService,
    private router: Router,
    private userservice: AdministrationService
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loading = true;
    Promise.all([
      this.loadSectors(),
      this.loadReviewerAssignments(),
      this.loadAllMainCriteria(),
      this.loadAllSubCriteria(),
      this.loadAllReviewers()
    ]).finally(() => this.loading = false);
  }

  openFormModal() {
    this.resetForm();
    this.showFormModal = true;
  }

  closeFormModal() {
    this.showFormModal = false;
    this.resetForm();
  }

  loadSectors(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userservice.getAllSectors().subscribe(
        (res: any) => { 
          this.sectors = res?.data || []; 
          // console.log('Sectors loaded:', this.sectors);
          resolve(); 
        },
        (err) => { 
          this.showError('خطأ في تحميل القطاعات', err.message); 
          reject(err); 
        }
      );
    });
  }

  onSectorChange() {
    const rawValue = this.form.sector;
    // console.log('🔄 Sector changed - Raw value:', rawValue);
    // console.log('🔄 Type:', typeof rawValue);
    // console.log('🔄 Is null?:', rawValue === null);
    // console.log('🔄 Is string?:', typeof rawValue === 'string');
    
    // Reset dependent fields
    this.form.mainCriteria = null;
    this.form.subCriteria = null;
    this.form.supervisor = null;
    this.mainCriteriaList = [];
    this.subCriteriaList = [];
    this.reviewers = [];

    // Validate and extract sector ID
    if (!rawValue) {
      // console.log('⚠️ No sector selected');
      return;
    }

    let sectorId: string;
    
    if (typeof rawValue === 'string') {
      sectorId = rawValue;
    } else if (typeof rawValue === 'object' && rawValue._id) {
      sectorId = rawValue._id;
      console.warn('⚠️ Sector value is object, extracting _id');
    } else {
      console.error('❌ Invalid sector value:', rawValue);
      return;
    }
    
    // console.log('✅ Final sector ID to use:', sectorId);
    // console.log('✅ Sector ID type:', typeof sectorId);
    
    this.loadMainCriteriaBySector(sectorId);
    this.loadReviewersBySector(sectorId);
  }

  loadMainCriteriaBySector(sectorId: string) {
    this.loadingMainCriteria = true;
    this.decisionService.getMainCriteriaBySector(sectorId).subscribe(
      (res: any) => { 
        this.mainCriteriaList = res?.data || []; 
        // console.log('Main criteria loaded:', this.mainCriteriaList);
        this.loadingMainCriteria = false; 
      },
      (err) => { 
        this.showError('خطأ في تحميل المعايير الرئيسية', err.message); 
        this.loadingMainCriteria = false; 
      }
    );
  }

  onMainCriteriaChange() {
    const rawValue = this.form.mainCriteria;
    // console.log('🔄 Main criteria changed - Raw value:', rawValue);
    // console.log('🔄 Type:', typeof rawValue);
    
    this.form.subCriteria = null;
    this.subCriteriaList = [];
    
    if (!rawValue) {
      // console.log('⚠️ No main criteria selected');
      return;
    }

    let mainCriteriaId: string;
    
    if (typeof rawValue === 'string') {
      mainCriteriaId = rawValue;
    } else if (typeof rawValue === 'object' && rawValue._id) {
      mainCriteriaId = rawValue._id;
      // console.warn('⚠️ Main criteria value is object, extracting _id');
    } else {
      // console.error('❌ Invalid main criteria value:', rawValue);
      return;
    }
    
    // console.log('✅ Final main criteria ID to use:', mainCriteriaId);
    
    this.loadSubCriteriaByMainCriteria(mainCriteriaId);
  }

  loadSubCriteriaByMainCriteria(mainCriteriaId: string) {
    this.loadingSubCriteria = true;
    this.decisionService.getSubCriteriaByMainCriteria(mainCriteriaId).subscribe(
      (res: any) => { 
        this.subCriteriaList = res?.data || []; 
        // console.log('Sub criteria loaded:', this.subCriteriaList);
        this.loadingSubCriteria = false; 
      },
      (err) => { 
        this.showError('خطأ في تحميل المعايير الفرعية', err.message); 
        this.loadingSubCriteria = false; 
      }
    );
  }

  loadReviewersBySector(sectorId: string) {
    // console.log('🔍 Loading reviewers for sector:', sectorId);
    // console.log('🔍 Sector ID type:', typeof sectorId);
    this.loadingReviewers = true;
    
    this.userservice.getusersbyrole(sectorId).subscribe(
      (res: any) => { 
        // console.log('📦 Raw response from backend:', res);
        
        // Fix: البيانات راجعة مباشرة في res مش في res.data
        const allReviewers = Array.isArray(res) ? res : (res?.data || []);
        
        // console.log('📊 Total reviewers from backend:', allReviewers.length);
        
        // Log each reviewer's sectors for debugging
        allReviewers.forEach((reviewer: any, index: number) => {
          // console.log(`👤 Reviewer ${index + 1}: ${reviewer.fullname}`);
          // console.log('   Sectors:', reviewer.sector);
          if (reviewer.sector && Array.isArray(reviewer.sector)) {
            reviewer.sector.forEach((s: any, i: number) => {
              const sid = s._id || s;
              // console.log(`   - Sector ${i + 1} ID: "${sid}" (type: ${typeof sid})`);
              // console.log(`   - Match with selected "${sectorId}": ${sid === sectorId}`);
            });
          }
        });
        
        // Filter reviewers by sector
        this.reviewers = allReviewers.filter((reviewer: any) => {
          if (!reviewer.sector || !Array.isArray(reviewer.sector)) {
            // console.log(`❌ Reviewer ${reviewer.fullname}: No sector array`);
            return false;
          }
          
          // Check if the selected sector exists in the reviewer's sectors array
          const hasMatch = reviewer.sector.some((s: any) => {
            const reviewerSectorId = s._id || s;
            const match = reviewerSectorId === sectorId;
            return match;
          });
          
          // console.log(`${hasMatch ? '✅' : '❌'} Reviewer ${reviewer.fullname}: ${hasMatch ? 'MATCHED' : 'NOT MATCHED'}`);
          return hasMatch;
        });
        
        // console.log('✅ Filtered reviewers for sector:', this.reviewers);
        // console.log('📏 Number of matching reviewers:', this.reviewers.length);
        
        if (this.reviewers.length > 0) {
          // console.log('👤 First filtered reviewer:', this.reviewers[0]);
        } else {
          // console.log('⚠️ No reviewers found for this sector');
          // console.log('⚠️ Selected sector ID was:', sectorId);
        }
        
        this.loadingReviewers = false; 
      },
      (err) => { 
        console.error('❌ Error loading reviewers:', err);
        console.error('Error details:', err.error);
        this.showError('خطأ في تحميل المراجعين', err.message); 
        this.loadingReviewers = false; 
      }
    );
  }

  loadReviewerAssignments(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.decisionService.getReviewerAssignments().subscribe(
        (res: any) => { 
          this.reviewerAssignments = res?.data || []; 
          // console.log('Reviewer assignments loaded:', this.reviewerAssignments);
          resolve(); 
        },
        (err) => { 
          this.showError('خطأ في تحميل البيانات', err.message); 
          reject(err); 
        }
      );
    });
  }

  loadAllMainCriteria(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.decisionService.getAllMainCriteria().subscribe(
        (res: any) => { 
          this.allMainCriteria = res?.data || []; 
          resolve(); 
        },
        (err) => reject(err)
      );
    });
  }

  loadAllSubCriteria(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.decisionService.getAllSubCriteria().subscribe(
        (res: any) => { 
          this.allSubCriteria = res?.data || []; 
          resolve(); 
        },
        (err) => reject(err)
      );
    });
  }

  loadAllReviewers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userservice.getAllUsers().subscribe(
        (res: any) => { 
          // Fix: Handle both array response and object with data property
          this.allReviewers = Array.isArray(res) ? res : (res?.data || []);
          // console.log('All reviewers loaded:', this.allReviewers.length);
          resolve(); 
        },
        (err) => reject(err)
      );
    });
  }

  // دوال مساعدة لعرض الأسماء في الجدول
  getSectorName(sectorData: any): string {
    if (!sectorData) return '-';
    
    // إذا كان Array (جديد من Backend)
    if (Array.isArray(sectorData)) {
      if (sectorData.length === 0) return '-';
      // لو الـ sector جاي populated من Backend
      if (sectorData[0].sector) {
        return sectorData[0].sector;
      }
      // لو جاي بس _id
      const firstSectorId = sectorData[0]._id || sectorData[0];
      const sector = this.sectors.find(s => s._id === firstSectorId);
      return sector?.sector || '-';
    }
    
    // إذا كان Object مباشر
    if (typeof sectorData === 'object' && sectorData.sector) {
      return sectorData.sector;
    }
    
    // إذا كان String (_id)
    const id = typeof sectorData === 'object' ? sectorData._id : sectorData;
    const sector = this.sectors.find(s => s._id === id);
    return sector?.sector || '-';
  }

  getMainCriteriaName(criteriaData: any): string {
    if (!criteriaData) return '-';
    
    // إذا كان Object populated من Backend
    if (typeof criteriaData === 'object' && criteriaData.name) {
      return criteriaData.name;
    }
    
    // إذا كان String (_id)
    const id = typeof criteriaData === 'object' ? criteriaData._id : criteriaData;
    const criteria = this.allMainCriteria.find(m => m._id === id);
    return criteria?.name || '-';
  }

  getSubCriteriaName(criteriaData: any): string {
    if (!criteriaData) return '-';
    
    // إذا كان Object populated من Backend
    if (typeof criteriaData === 'object' && criteriaData.name) {
      return criteriaData.name;
    }
    
    // إذا كان String (_id)
    const id = typeof criteriaData === 'object' ? criteriaData._id : criteriaData;
    const criteria = this.allSubCriteria.find(s => s._id === id);
    return criteria?.name || '-';
  }

  getSupervisorName(supervisorData: any): string {
    if (!supervisorData) return '-';
    
    // إذا كان Object populated من Backend
    if (typeof supervisorData === 'object' && supervisorData.fullname) {
      return supervisorData.fullname;
    }
    
    // إذا كان String (_id)
    const id = typeof supervisorData === 'object' ? supervisorData._id : supervisorData;
    const supervisor = this.allReviewers.find(r => r._id === id);
    return supervisor?.fullname || '-';
  }

  isFormValid(): boolean {
    return !!(
      this.form.sector &&
      this.form.mainCriteria &&
      this.form.subCriteria &&
      this.form.supervisor
    );
  }

  saveReviewer() {
    this.formSubmitted = true;

    if (!this.isFormValid()) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'تنبيه', 
        text: 'من فضلك املأ جميع الحقول المطلوبة' 
      });
      return;
    }

    const payload = { ...this.form };
    // console.log('Saving reviewer with payload:', payload);

    if (this.editingId) {
      this.updateReviewer(this.editingId, payload);
    } else {
      this.createReviewer(payload);
    }
  }

  createReviewer(payload: any) {
    this.decisionService.addReviewerAssignment(payload).subscribe(
      () => { 
        Swal.fire({ 
          icon: 'success', 
          title: 'تم الحفظ بنجاح', 
          timer: 2000, 
          showConfirmButton: false 
        }); 
        this.closeFormModal(); 
        this.loadReviewerAssignments(); 
      },
      (err) => {
        console.error('Error creating reviewer:', err);
        this.showError('خطأ في الحفظ', err.message || 'حدث خطأ أثناء حفظ البيانات');
      }
    );
  }

  updateReviewer(id: string, payload: any) {
    this.decisionService.updateReviewerAssignment(id, payload).subscribe(
      () => { 
        Swal.fire({ 
          icon: 'success', 
          title: 'تم التحديث بنجاح', 
          timer: 2000, 
          showConfirmButton: false 
        }); 
        this.closeFormModal(); 
        this.loadReviewerAssignments(); 
      },
      (err) => {
        console.error('Error updating reviewer:', err);
        this.showError('خطأ في التحديث', err.message || 'حدث خطأ أثناء تحديث البيانات');
      }
    );
  }

  editReviewer(assignment: any) {
    this.editingId = assignment._id;
    
    // Extract IDs properly from the assignment
    const sectorId = this.extractId(assignment.sector);
    const mainCriteriaId = this.extractId(assignment.mainCriteria);
    const subCriteriaId = this.extractId(assignment.subCriteria);
    const supervisorId = this.extractId(assignment.supervisor);
    
    // console.log('📝 Editing reviewer assignment:');
    // console.log('   Sector ID:', sectorId);
    // console.log('   Main Criteria ID:', mainCriteriaId);
    // console.log('   Sub Criteria ID:', subCriteriaId);
    // console.log('   Supervisor ID:', supervisorId);
    
    this.form = {
      sector: sectorId,
      mainCriteria: mainCriteriaId,
      subCriteria: subCriteriaId,
      supervisor: supervisorId
    };

    if (this.form.sector) {
      this.loadMainCriteriaBySector(this.form.sector);
      this.loadReviewersBySector(this.form.sector);
      if (this.form.mainCriteria) {
        this.loadSubCriteriaByMainCriteria(this.form.mainCriteria);
      }
    }

    this.showFormModal = true;
  }
  
  // Helper method to extract ID from various formats
  private extractId(value: any): string | null {
    if (!value) return null;
    
    // If it's an array (like sector), get first item
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      value = value[0];
    }
    
    // If it's an object with _id
    if (typeof value === 'object' && value._id) {
      return value._id;
    }
    
    // If it's already a string
    if (typeof value === 'string') {
      return value;
    }
    
    return null;
  }

  deleteReviewer(id?: string) {
    if (!id) return;
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'سيتم حذف هذا التعيين من النظام',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذفه',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.decisionService.deleteReviewerAssignment(id).subscribe(
          () => { 
            Swal.fire({ 
              icon: 'success', 
              title: 'تم الحذف', 
              timer: 2000, 
              showConfirmButton: false 
            }); 
            this.loadReviewerAssignments(); 
          },
          (err) => {
            console.error('Error deleting reviewer:', err);
            this.showError('خطأ في الحذف', err.message || 'حدث خطأ أثناء حذف البيانات');
          }
        );
      }
    });
  }

  resetForm() {
    this.form = { 
      sector: null,  // Changed from '' to null
      mainCriteria: null,  // Changed from '' to null
      subCriteria: null,  // Changed from '' to null
      supervisor: null  // Changed from '' to null
    };
    this.editingId = null;
    this.mainCriteriaList = [];
    this.subCriteriaList = [];
    this.reviewers = [];
    this.formSubmitted = false;
  }

  showError(title: string, message: string) {
    Swal.fire({ icon: 'error', title, text: message });
  }
}