import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, FormArray } from '@angular/forms';
import { MainCriteria, SubCriteria } from 'src/app/model/criteria';
import { CriteriaService } from 'src/app/service/criteria.service';
import { LetterService } from 'src/app/service/letter.service';
import { LoginService } from 'src/app/service/login.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { DomSanitizer } from '@angular/platform-browser';

export function noLeadingSpaces(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const value = control.value.toString();
  if (value.startsWith(' ')) {
    return { startsWithSpace: true };
  }
  return null;
}

export function dateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const date = new Date(control.value);
    if (isNaN(date.getTime())) {
      return { invalidDate: true };
    }
    return null;
  };
}

export function endDateAfterStartValidator(startDateControlName: string, endDateControlName: string): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const startDate = formGroup.get(startDateControlName)?.value;
    const endDate = formGroup.get(endDateControlName)?.value;
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      formGroup.get(endDateControlName)?.setErrors({ endDateBeforeStart: true });
      return { endDateBeforeStart: true };
    } else {
      formGroup.get(endDateControlName)?.setErrors(null);
      return null;
    }
  };
}

@Component({
  selector: 'app-declaration',
  templateUrl: './declaration.component.html',
  styleUrls: ['./declaration.component.css'],
})
export class DeclarationComponent implements OnInit {
  messageForm!: FormGroup;
  mainCriteriaList: MainCriteria[] = [];
  subCriteriaList: SubCriteria[] = [];
  filteredMainCriteria: MainCriteria[] = [];
  filteredSubCriteria: SubCriteria[] = [];
  submitting = false;
  loadingSubCriteria = false;
  successMsg = '';
  errorMsg = '';
  formSubmitted = false;
  mainSearchTerm = '';
  subSearchTerm = '';
  showMainDropdown = false;
  showSubDropdown = false;
  selectedMainCriteriaTitle = '';
  selectedSubCriteriaTitle = '';

  // متغيرات للجداول
  showTableModal = false;
  tableRows = 3;
  tableCols = 3;
  currentTableData: any[][] = [];
  editingTableIndex: number | null = null;
  private lastFocusedCell: { row: number, col: number } | null = null;

  // متغيرات PDF Testing
  pdfGenerating = false;
  pdfLoading = false;
  pdfFilename: string | null = null;

  // متغيرات المسودة
  isEditingDraft = false;
  draftId: string | null = null;
  originalDraftData: any = null;

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['clean']
    ]
  };

  constructor(
    private fb: FormBuilder,
    private criteriaService: CriteriaService,
    private letterService: LetterService,
    private loginService: LoginService,
    private sanitizer: DomSanitizer,
    private router: Router
  ) { }

  user = this.loginService.getUserFromLocalStorage();

  ngOnInit(): void {
    this.initializeForm();
    this.loadMainCriteria();
    this.checkEditMode();
  }

  // ==================== وظائف المسودات ====================

  // التحقق من وضع التعديل
  checkEditMode(): void {
    const draftData = localStorage.getItem('editingLetterDraft');

    if (draftData) {
      try {
        this.originalDraftData = JSON.parse(draftData);
        this.isEditingDraft = true;
        this.draftId = this.originalDraftData._id;

        // تعبئة النموذج ببيانات المسودة بعد تحميل المعايير
        setTimeout(() => {
          this.populateFormWithDraftData();
        }, 500);
      } catch (error) {
        console.error('Error parsing draft data:', error);
        this.showError('حدث خطأ في تحميل بيانات المسودة');
      }
    }
  }

  // تعبئة النموذج ببيانات المسودة
  populateFormWithDraftData(): void {
    if (!this.originalDraftData || !this.messageForm) return;

    // تعبئة الحقول الأساسية
    this.messageForm.patchValue({
      title: this.originalDraftData.title,
      mainCriteria: this.originalDraftData.mainCriteria?._id || this.originalDraftData.mainCriteria,
      subCriteria: this.originalDraftData.subCriteria?._id || this.originalDraftData.subCriteria,
      fullName: this.originalDraftData.fullName || '',
      entityName: this.originalDraftData.entityName || '',
      nationalId: this.originalDraftData.nationalId || '',
      phoneNumber: this.originalDraftData.phoneNumber || '',
      startDate: this.originalDraftData.StartDate ? new Date(this.originalDraftData.StartDate).toISOString().split('T')[0] : '',
      endDate: this.originalDraftData.EndDate ? new Date(this.originalDraftData.EndDate).toISOString().split('T')[0] : '',
      signatureType: this.originalDraftData.signatureType || ''
    });

    // تعبئة المعايير
    if (this.originalDraftData.mainCriteria) {
      this.selectedMainCriteriaTitle = typeof this.originalDraftData.mainCriteria === 'object'
        ? this.originalDraftData.mainCriteria.name
        : 'المعيار الرئيسي';
    }

    if (this.originalDraftData.subCriteria) {
      this.selectedSubCriteriaTitle = typeof this.originalDraftData.subCriteria === 'object'
        ? this.originalDraftData.subCriteria.name
        : 'المعيار الفرعي';
    }

    // تحميل المعايير الفرعية إذا كان هناك معيار رئيسي
    if (this.originalDraftData.mainCriteria) {
      const mainId = typeof this.originalDraftData.mainCriteria === 'object'
        ? this.originalDraftData.mainCriteria._id
        : this.originalDraftData.mainCriteria;
      this.loadSubCriteria(mainId);
    }

    // تعبئة الحيثيات
    if (this.originalDraftData.Rationale && Array.isArray(this.originalDraftData.Rationale)) {
      this.rationaleFields.clear();
      this.originalDraftData.Rationale.forEach((rationale: string) => {
        this.rationaleFields.push(this.fb.group({
          rationale: [rationale, Validators.required]
        }));
      });
    }

    // تعبئة بنود القرار
    if (this.originalDraftData.descriptions && Array.isArray(this.originalDraftData.descriptions)) {
      this.contentFields.clear();
      this.originalDraftData.descriptions.forEach((description: string) => {
        this.contentFields.push(this.fb.group({
          content: [description, Validators.required]
        }));
      });
    }

    // تعبئة الجداول إذا وجدت
    if (this.originalDraftData.tables && Array.isArray(this.originalDraftData.tables)) {
      this.tablesArray.clear();
      this.originalDraftData.tables.forEach((table: any) => {
        this.tablesArray.push(this.fb.control(table));
      });
    }
  }

  // ==================== وظائف الحفظ والإرسال ====================

onSubmit() {
  this.formSubmitted = true;

  if (this.messageForm.invalid) {
    Object.keys(this.f).forEach(key => this.f[key].markAsTouched());
    this.contentFields.controls.forEach(c => c.markAllAsTouched());
    this.rationaleFields.controls.forEach(c => c.markAllAsTouched());
    this.showWarning('يرجى تصحيح الأخطاء في النموذج قبل الإرسال');
    return;
  }

  const isPresident = this.user?.role === 'UniversityPresident';

  Swal.fire({
    title: isPresident ? 'اعتماد القرار' : 'إرسال القرار للمراجعة',
    // html: `
    //   <div style="text-align:right; direction:rtl;">
    //     <p style="font-size:16px; margin-bottom:15px;">
    //       <strong>${isPresident ? 'تأكيد اعتماد القرار' : 'اختر طريقة حفظ القرار:'}</strong>
    //     </p>
    //     <ul class="text-muted" style="padding-right:20px;">
    //       <li><strong>حفظ كمسودة:</strong> حفظ للاستكمال لاحقاً</li>
    //       <li>
    //         <strong>${isPresident ? 'اعتماد مباشر:' : 'إرسال للمراجعة:'}</strong>
    //         ${isPresident ? 'اعتماد القرار فوراً' : 'إرسال القرار للمشرف'}
    //       </li>
    //     </ul>
    //   </div>
    // `,
    icon: 'question',
    // showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: isPresident
      ? '<i class="fa fa-check me-1"></i> اعتماد'
      : '<i class="fa fa-send me-1"></i> إرسال للمراجعة',
    // denyButtonText: '<i class="fa fa-save me-1"></i> حفظ كمسودة',
    cancelButtonText: '<i class="fa fa-times me-1"></i> إلغاء',
    reverseButtons: true,
    confirmButtonColor: isPresident ? '#198754' : '#0d6efd'
  }).then(result => {
    if (result.isConfirmed) {

      // ✅ نفس الدالة – اختلاف الحالة فقط
      this.messageForm.patchValue({
        status: isPresident ? 'معتمد' : 'قيد المراجعة'
      });

      this.submitForReview();

    } else if (result.isDenied) {
      this.saveAsDraft();
    } else {
      this.formSubmitted = false;
    }
  });
}



  // دالة حفظ المسودة
  saveAsDraft(): void {
    this.formSubmitted = true;

    // التحقق من الصحة الأساسية للمسودة
    const requiredFields = ['title', 'mainCriteria', 'subCriteria'];
    let hasRequiredErrors = false;

    for (const field of requiredFields) {
      if (this.f[field].invalid) {
        this.f[field].markAsTouched();
        hasRequiredErrors = true;
      }
    }

    if (hasRequiredErrors) {
      this.showWarning('يرجى ملء الحقول المطلوبة لحفظ المسودة');
      return;
    }

    Swal.fire({
      title: 'حفظ كمسودة',
      // html: `
      //   <div style="text-align: right; direction: rtl;">
      //     <p style="font-size: 16px; margin-bottom: 15px;">
      //       <strong>هل تريد حفظ القرار كمسودة؟</strong>
      //     </p>
      //     <p style="font-size: 14px; color: #666;">
      //       سيتم حفظ القرار في قائمة المسودات ويمكنك تعديله وإرساله لاحقاً
      //     </p>
      //   </div>
      // `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fa fa-save me-1"></i> حفظ كمسودة',
      cancelButtonText: '<i class="fa fa-times me-1"></i> إلغاء',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.proceedWithSave('مسودة', 'draft');
      } else {
        this.formSubmitted = false;
      }
    });
  }

  // دالة إرسال للمراجعة (بدون SweetAlert)
submitForReview(): void {
  this.proceedWithSave('مكتمل', 'review');
}


  // دالة اعتماد مباشر (لرئيس الجامعة فقط)
  approveDirectly(): void {
    if (this.user?.role !== 'UniversityPresident') {
      this.showError('غير مصرح لك باعتماد القرارات مباشرة');
      return;
    }

    Swal.fire({
      title: 'اعتماد القرار مباشرة',
      html: `
        <div style="text-align: right; direction: rtl;">
          <p style="font-size: 16px; margin-bottom: 15px;">
            <strong>هل تريد اعتماد القرار مباشرة؟</strong>
          </p>
          <p style="font-size: 14px; color: #666;">
            سيتم اعتماد القرار فوراً دون الحاجة للمراجعة
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fa fa-check-circle me-1"></i> اعتماد مباشر',
      cancelButtonText: '<i class="fa fa-times me-1"></i> إلغاء',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.proceedWithSave('مكتمل', 'approve');
      }
    });
  }

  // دالة رئيسية للحفظ
  private proceedWithSave(saveStatus: 'مسودة' | 'مكتمل', actionType: 'draft' | 'review' | 'approve'): void {
    this.submitting = true;
    this.successMsg = '';
    this.errorMsg = '';

    const payload = this.prepareLetterData(saveStatus, actionType);

    // إذا كان تعديل مسودة موجودة
    if (this.isEditingDraft && this.draftId) {
      this.updateExistingDraft(payload);
    } else {
      this.createNewLetter(payload);
    }
  }

  // تجهيز البيانات للحفظ
  private prepareLetterData(saveStatus: 'مسودة' | 'مكتمل', actionType: 'draft' | 'review' | 'approve'): any {
    const contentTexts = this.contentFields.controls.map(control => {
      const htmlContent = control.get('content')?.value || '';
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const rationaleTexts = this.rationaleFields.controls.map(control => {
      const htmlContent = control.get('rationale')?.value || '';
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const tables = this.tablesArray.value;

    // تحديد status بناءً على نوع الإجراء
    let status: string | null = null;
    let transactionNumber: number | null = null;

    if (saveStatus === 'مسودة') {
      status = 'مسودة' // المسودة ليس لها status
      transactionNumber = null; // المسودة ليس لها transactionNumber
    } else {
      if (actionType === 'approve') {
        status = 'approved'; // اعتماد مباشر
        // transactionNumber سيتم توليده في الـ backend
      } else if (actionType === 'review') {
        status = 'in_progress'; // إرسال للمراجعة
        transactionNumber = null; // سيتم تعيينه عند الاعتماد
      }
    }

    // إذا كان رئيس الجامعة ويحفظ مسودة، نعطي transactionNumber
    if (saveStatus === 'مسودة' && this.user?.role === 'UniversityPresident') {
      status = null; // لكن status يظل null للمسودة
      transactionNumber = null;
    }

    return {
      title: this.f['title'].value,
      descriptions: contentTexts,
      mainCriteria: this.f['mainCriteria'].value,
      subCriteria: this.f['subCriteria'].value,
      Rationale: rationaleTexts,
      signatureType: this.f['signatureType'].value || null,
      SaveStatus: saveStatus,
      status: status,
      date: new Date().toISOString(),
      transactionNumber: transactionNumber,
      StartDate: this.f['startDate'].value
        ? new Date(this.f['startDate'].value).toISOString()
        : null,
      EndDate: this.f['endDate'].value
        ? new Date(this.f['endDate'].value).toISOString()
        : null,
      fullName: this.f['fullName'].value || null,
      entityName: this.f['entityName'].value || null,
      nationalId: this.f['nationalId'].value || null,
      phoneNumber: this.f['phoneNumber'].value || null,
      tables: tables,
      // إضافة معلومات المستخدم للمسودة
      user: this.user?._id,
      userName: this.user?.fullname || localStorage.getItem('fullname') || '',
      userId: localStorage.getItem('userId') || ''
    };
  }

  // تحديث مسودة موجودة
  private updateExistingDraft(payload: any): void {
    this.letterService.updateLetter(this.draftId!, payload).subscribe({
      next: (res: any) => {
        this.handleSaveResponse(res, payload.SaveStatus, true);
      },
      error: (err: any) => {
        console.error('❌ Error updating draft:', err);
        this.showError('حدث خطأ أثناء تحديث المسودة');
        this.submitting = false;
      },
    });
  }

  // إنشاء قرار جديد
  private createNewLetter(payload: any): void {
    this.letterService.addLetterType(payload).subscribe({
      next: (res: any) => {
        this.handleSaveResponse(res, payload.SaveStatus, false);
      },
      error: (err: any) => {
        console.error('❌ Error creating letter:', err);
        this.showError('حدث خطأ أثناء حفظ القرار');
        this.submitting = false;
      },
    });
  }

  // معالجة استجابة الحفظ
  private handleSaveResponse(res: any, saveStatus: string, isUpdate: boolean): void {
  this.submitting = false;

  if (res.success) {
    const message = this.getSaveSuccessMessage(saveStatus, isUpdate);
    this.showSuccess(message);

    // تنظيف البيانات المحفوظة فقط بدون تنقل
    this.clearSavedData();

    // إعادة ضبط النموذج والبقاء في نفس الصفحة
    setTimeout(() => {
      this.cleanupForm();
    }, 1500);

  } else {
    this.showError(res.message || 'حدث خطأ أثناء حفظ القرار');
  }
}


  // الحصول على رسالة النجاح المناسبة
 private getSaveSuccessMessage(saveStatus: string, isUpdate: boolean): string {
  const isPresident = this.user?.role === 'UniversityPresident';

  // المسودة
  if (saveStatus === 'مسودة') {
    return isUpdate
      ? 'تم تحديث المسودة بنجاح'
      : 'تم حفظ القرار كمسودة بنجاح';
  }

  // غير مسودة
  if (isPresident) {
    return 'تم اعتماد القرار بنجاح';
  }

  return isUpdate
    ? 'تم إرسال القرار بنجاح'
    : 'تم إرسال القرار للمراجعة بنجاح';
}


  // ==================== وظائف PDF Testing ====================

  private prepareLetterDataForPDF(): any {
    const contentTexts = this.contentFields.controls.map(control => {
      const htmlContent = control.get('content')?.value || '';
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const rationaleTexts = this.rationaleFields.controls.map(control => {
      const htmlContent = control.get('rationale')?.value || '';
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const tables = this.tablesArray.value;

    return {
      title: this.f['title'].value,
      descriptions: contentTexts,
      mainCriteria: this.f['mainCriteria'].value,
      subCriteria: this.f['subCriteria'].value,
      Rationale: rationaleTexts,
      signatureType: this.f['signatureType'].value || null,
      date: new Date().toISOString(),
      transactionNumber: null,
      StartDate: this.f['startDate'].value
        ? new Date(this.f['startDate'].value).toISOString()
        : null,
      EndDate: this.f['endDate'].value
        ? new Date(this.f['endDate'].value).toISOString()
        : null,
      fullName: this.f['fullName'].value || null,
      entityName: this.f['entityName'].value || null,
      nationalId: this.f['nationalId'].value || null,
      phoneNumber: this.f['phoneNumber'].value || null,
      tables: tables
    };
  }

  // توليد PDF تجريبي
  generateTestingPdf(): void {
    if (this.messageForm.invalid) {
      Object.keys(this.f).forEach((key) => {
        this.f[key].markAsTouched();
      });
      this.contentFields.controls.forEach(control => {
        control.markAllAsTouched();
      });
      this.rationaleFields.controls.forEach(control => {
        control.markAllAsTouched();
      });

      Swal.fire({
        icon: 'warning',
        title: 'يرجى إكمال جميع الحقول المطلوبة',
        text: 'يجب ملء جميع البيانات الإلزامية قبل إنشاء PDF',
        showConfirmButton: true
      });
      return;
    }

    this.pdfGenerating = true;

    const letterData = this.prepareLetterDataForPDF();

    this.letterService.printTestingPdfFromData(letterData).subscribe({
      next: (res) => {
        this.pdfGenerating = false;
        const filename = res.data.fileName;
        this.savePdfFilename(filename);

        Swal.fire({
          icon: 'success',
          title: 'تم إنشاء PDF بنجاح',
          text: 'يمكنك الآن معاينة القرار قبل الحفظ النهائي',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('Error generating testing PDF:', err);
        this.pdfGenerating = false;
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ',
          text: err?.error?.message || 'لم نتمكن من إنشاء PDF',
          showConfirmButton: true
        });
      }
    });
  }

  // فتح PDF التجريبي
  openPdfTesting(): void {
    if (!this.pdfFilename) {
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف PDF متاح للعرض',
        text: 'يرجى إنشاء PDF أولاً',
        showConfirmButton: true
      });
      return;
    }

    const apiUrl = `http://localhost:3000/api/letters/view-pdf-onlineTesting/${encodeURIComponent(this.pdfFilename)}`;

    this.pdfLoading = true;

    this.letterService.getPDF(apiUrl).subscribe({
      next: (blob: Blob) => {
        this.pdfLoading = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err: any) => {
        console.error('Error fetching PDF:', err);
        this.pdfLoading = false;
        Swal.fire({
          icon: 'warning',
          title: 'لا يمكن عرض الملف حالياً',
          text: 'يرجى المحاولة مرة أخرى',
          showConfirmButton: true
        });
      }
    });
  }

  // تنزيل PDF
  downloadPdf(): void {
    if (!this.pdfFilename) {
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف PDF متاح للتنزيل',
        showConfirmButton: true
      });
      return;
    }

    const downloadName = this.generateDownloadName();
    this.letterService.downloadPDF(this.pdfFilename, downloadName);
  }

  // حفظ اسم ملف PDF
  private savePdfFilename(filename: string): void {
    this.pdfFilename = filename;
  }

  // توليد اسم الملف للتنزيل
  private generateDownloadName(): string {
    const title = this.f['title'].value
      ? this.f['title'].value.replace(/[^\w\u0600-\u06FF]/g, '_')
      : 'قرار';
    const date = new Date().toISOString().split('T')[0];
    return `قرار_تجريبي_${title}_${date}.pdf`;
  }

  // ==================== وظائف النموذج الأساسية ====================

  private initializeForm(): void {
    this.messageForm = this.fb.group(
      {
        mainCriteria: ['', [Validators.required]],
        subCriteria: ['', [Validators.required]],
        title: ['', [Validators.required, noLeadingSpaces]],
        rationaleFields: this.fb.array([this.createRationaleField()]),
        signatureType: [''],
        contentFields: this.fb.array([this.createContentField()]),
        tables: this.fb.array([]),
        fullName: [''],
        entityName: [''],
        nationalId: [''],
        phoneNumber: [''],
        startDate: ['', [dateValidator()]],
        endDate: ['', [dateValidator()]],
        date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      },
      { validators: endDateAfterStartValidator('startDate', 'endDate') }
    );

    this.messageForm.get('mainCriteria')?.valueChanges.subscribe(value => {
      if (value) {
        this.loadSubCriteria(value);
      } else {
        this.subCriteriaList = [];
        this.filteredSubCriteria = [];
        this.messageForm.get('subCriteria')?.setValue('');
        this.selectedSubCriteriaTitle = '';
      }
    });
  }

  createRationaleField(): FormGroup {
    return this.fb.group({
      rationale: ['', [Validators.required]]
    });
  }

  get rationaleFields(): FormArray {
    return this.messageForm.get('rationaleFields') as FormArray;
  }

  createContentField(): FormGroup {
    return this.fb.group({
      content: ['', [Validators.required]]
    });
  }

  get contentFields(): FormArray {
    return this.messageForm.get('contentFields') as FormArray;
  }

  get tablesArray(): FormArray {
    return this.messageForm.get('tables') as FormArray;
  }

  addRationaleField(): void {
    this.rationaleFields.push(this.createRationaleField());
  }

  removeRationaleField(index: number): void {
    if (this.rationaleFields.length > 1) {
      this.rationaleFields.removeAt(index);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'يجب أن يحتوي القرار على حيثية واحدة على الأقل',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  }

  addContentField(): void {
    this.contentFields.push(this.createContentField());
  }

  removeContentField(index: number): void {
    if (this.contentFields.length > 1) {
      const tableIndex = this.tablesArray.controls.findIndex(
        (ctrl: any) => ctrl.value.descriptionIndex === index
      );
      if (tableIndex >= 0) {
        this.tablesArray.removeAt(tableIndex);
      }

      this.tablesArray.controls.forEach((ctrl: any, i: number) => {
        if (ctrl.value.descriptionIndex > index) {
          ctrl.value.descriptionIndex -= 1;
        }
      });

      this.contentFields.removeAt(index);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'يجب أن يحتوي القرار على بند واحد على الأقل',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  }

  // ==================== وظائف الجداول ====================

  openTableModal(descriptionIndex?: number): void {
    this.showTableModal = true;
    this.editingTableIndex = descriptionIndex !== undefined ? descriptionIndex : null;

    if (descriptionIndex !== undefined && descriptionIndex !== null) {
      const existingTable = this.getExistingTable(descriptionIndex);
      if (existingTable) {
        this.tableRows = existingTable.rows;
        this.tableCols = existingTable.cols;
        this.currentTableData = JSON.parse(JSON.stringify(existingTable.data));
      } else {
        this.resetTableModal();
      }
    } else {
      this.resetTableModal();
    }

    setTimeout(() => {
      this.focusFirstCell();
    }, 100);
  }

  resetTableModal(): void {
    this.tableRows = 3;
    this.tableCols = 3;
    this.currentTableData = this.createEmptyTable(3, 3);
    this.lastFocusedCell = null;
  }

  createEmptyTable(rows: number, cols: number): any[][] {
    const table: any[][] = [];
    for (let i = 0; i < rows; i++) {
      table[i] = [];
      for (let j = 0; j < cols; j++) {
        table[i][j] = '';
      }
    }
    return table;
  }

  changeTableSize(): void {
    const newRows = Math.max(1, Math.min(20, this.tableRows));
    const newCols = Math.max(1, Math.min(10, this.tableCols));

    const newTable = this.createEmptyTable(newRows, newCols);

    for (let i = 0; i < Math.min(this.currentTableData.length, newRows); i++) {
      for (let j = 0; j < Math.min(this.currentTableData[0]?.length || 0, newCols); j++) {
        newTable[i][j] = this.currentTableData[i][j];
      }
    }

    this.currentTableData = newTable;
    this.tableRows = newRows;
    this.tableCols = newCols;

    setTimeout(() => {
      this.restoreFocus();
    }, 50);
  }

  saveTable(): void {
    if (!this.currentTableData || this.currentTableData.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'الجدول فارغ!',
        timer: 1500
      });
      return;
    }

    const tableData = {
      rows: this.tableRows,
      cols: this.tableCols,
      data: this.currentTableData,
      descriptionIndex: this.editingTableIndex !== null ? this.editingTableIndex : this.contentFields.length
    };

    const tableHTML = this.generateTableHTML(this.currentTableData);

    if (this.editingTableIndex !== null && this.editingTableIndex >= 0) {
      const contentField = this.contentFields.at(this.editingTableIndex);
      contentField.get('content')?.setValue(tableHTML);

      const existingIndex = this.tablesArray.controls.findIndex(
        (ctrl: any) => ctrl.value.descriptionIndex === this.editingTableIndex
      );
      if (existingIndex >= 0) {
        this.tablesArray.at(existingIndex).setValue(tableData);
      } else {
        this.tablesArray.push(this.fb.control(tableData));
      }
    } else {
      const newContentField = this.createContentField();
      newContentField.get('content')?.setValue(tableHTML);
      this.contentFields.push(newContentField);

      tableData.descriptionIndex = this.contentFields.length - 1;
      this.tablesArray.push(this.fb.control(tableData));
    }

    this.closeTableModal();

    Swal.fire({
      icon: 'success',
      title: 'تم إضافة الجدول بنجاح',
      timer: 1500,
      showConfirmButton: false
    });
  }

  generateTableHTML(data: any[][]): string {
    if (!data || data.length === 0) {
      return '<p>جدول فارغ</p>';
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover decision-table"
               style="width: 100%; border-collapse: collapse; margin: 10px 0; direction: rtl;">
          <tbody>`;

    data.forEach((row, rowIndex) => {
      html += '<tr>';
      row.forEach((cell, colIndex) => {
        const cellContent = cell || '&nbsp;';
        html += `
          <td style="border: 1px solid #dee2e6; padding: 8px;
                     text-align: right; vertical-align: middle;">
            ${cellContent}
          </td>`;
      });
      html += '</tr>';
    });

    html += `
          </tbody>
        </table>
      </div>`;

    return html;
  }

  getExistingTable(descriptionIndex: number): any {
    const tableControl = this.tablesArray.controls.find(
      (ctrl: any) => ctrl.value.descriptionIndex === descriptionIndex
    );
    return tableControl ? tableControl.value : null;
  }

  isTableDescription(index: number): boolean {
    const tableData = this.getExistingTable(index);
    return !!tableData && !!tableData.data && tableData.data.length > 0;
  }

  getTableContent(index: number): string {
    const tableData = this.getExistingTable(index);

    if (!tableData) {
      const contentField = this.contentFields.at(index);
      return contentField?.get('content')?.value || '';
    }

    return this.generateTableHTML(tableData.data);
  }

  getTableNumber(index: number): number {
    const tables = this.tablesArray.value;
    const tableIndices = tables
      .map((table: any) => table.descriptionIndex)
      .sort((a: number, b: number) => a - b);

    const position = tableIndices.indexOf(index);
    return position >= 0 ? position + 1 : 1;
  }

  closeTableModal(): void {
    this.showTableModal = false;
    this.editingTableIndex = null;
    this.lastFocusedCell = null;
    this.resetTableModal();
  }

  updateCellValue(rowIndex: number, colIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (this.currentTableData[rowIndex] && this.currentTableData[rowIndex][colIndex] !== undefined) {
      this.currentTableData[rowIndex][colIndex] = value;
    }

    this.lastFocusedCell = { row: rowIndex, col: colIndex };
  }

  trackFocus(rowIndex: number, colIndex: number): void {
    this.lastFocusedCell = { row: rowIndex, col: colIndex };
  }

  restoreFocus(): void {
    if (this.lastFocusedCell) {
      const { row, col } = this.lastFocusedCell;
      const cellId = `cell-${row}-${col}`;
      const cellInput = document.getElementById(cellId);
      if (cellInput) {
        cellInput.focus();
      }
    } else {
      this.focusFirstCell();
    }
  }

  focusFirstCell(): void {
    const firstCell = document.getElementById('cell-0-0');
    if (firstCell) {
      firstCell.focus();
    }
  }

  trackByRow(index: number, row: any[]): any {
    return index;
  }

  trackByCell(index: number, cell: any): any {
    return index;
  }

  // ==================== وظائف المعايير ====================

  toggleMainDropdown(): void {
    this.showMainDropdown = !this.showMainDropdown;
    if (this.showMainDropdown) {
      this.mainSearchTerm = '';
      this.filteredMainCriteria = [...this.mainCriteriaList];

      setTimeout(() => {
        const searchInput = document.querySelector('input[placeholder="ابحث عن المعيار الرئيسي..."]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  }

  private loadMainCriteria(): void {
    this.criteriaService.getAllMainCriteria().subscribe({
      next: (criteria: MainCriteria[]) => {
        this.mainCriteriaList = criteria;
        this.filteredMainCriteria = [];
      },
      error: (err: any) => {
        console.error('❌ Error loading main criteria:', err);
        this.showError('حدث خطأ في تحميل المعايير الرئيسية');
      },
    });
  }

  private loadSubCriteria(mainCriteriaId: string): void {
    if (!mainCriteriaId || typeof mainCriteriaId !== 'string') {
      console.warn('⚠️ Invalid mainCriteriaId:', mainCriteriaId);
      return;
    }

    this.loadingSubCriteria = true;
    this.subCriteriaList = [];
    this.filteredSubCriteria = [];
    this.messageForm.get('subCriteria')?.setValue('');
    this.selectedSubCriteriaTitle = '';
    this.subSearchTerm = '';

    this.criteriaService.getSubCriteriaById(mainCriteriaId).subscribe({
      next: (criteria: SubCriteria[]) => {
        if (Array.isArray(criteria)) {
          this.subCriteriaList = criteria;
          this.filteredSubCriteria = [...criteria];
        } else {
          console.warn('⚠️ Received non-array response:', criteria);
          this.subCriteriaList = [];
          this.filteredSubCriteria = [];
        }
        this.loadingSubCriteria = false;
      },
      error: (err: any) => {
        console.error('❌ Error loading sub criteria:', err);
        this.subCriteriaList = [];
        this.filteredSubCriteria = [];
        this.loadingSubCriteria = false;
        this.showError('حدث خطأ في تحميل المعايير الفرعية');
      },
    });
  }

  filterMainCriteria(searchTerm: string): void {
    this.mainSearchTerm = searchTerm;
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredMainCriteria = [...this.mainCriteriaList];
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      this.filteredMainCriteria = this.mainCriteriaList.filter((criteria) =>
        criteria.name.toLowerCase().includes(lowerSearchTerm)
      );
    }
  }

  selectMainCriteria(criteriaId: string, criteriaName: string): void {
    if (!criteriaId || !criteriaName) {
      console.warn('⚠️ Invalid criteria selection');
      return;
    }

    this.f['mainCriteria'].setValue(criteriaId);
    this.selectedMainCriteriaTitle = criteriaName;
    this.mainSearchTerm = '';
    this.filteredMainCriteria = [];
    this.showMainDropdown = false;
    this.f['mainCriteria'].setErrors(null);
    this.f['mainCriteria'].markAsTouched();

    this.f['subCriteria'].setValue('');
    this.selectedSubCriteriaTitle = '';
  }

  toggleSubDropdown(): void {
    if (!this.f['mainCriteria'].value) {
      this.showWarning('يرجى اختيار المعيار الرئيسي أولاً');
      return;
    }

    this.showSubDropdown = !this.showSubDropdown;

    if (this.showSubDropdown) {
      this.filteredSubCriteria = [...this.subCriteriaList];
    }
  }

  filterSubCriteria(searchTerm: string): void {
    this.subSearchTerm = searchTerm;

    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredSubCriteria = [...this.subCriteriaList];
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase().trim();
      this.filteredSubCriteria = this.subCriteriaList.filter((criteria) =>
        criteria.name.toLowerCase().includes(lowerSearchTerm)
      );
    }
  }

  selectSubCriteria(criteriaId: string, criteriaName: string): void {
    if (!criteriaId || !criteriaName) {
      console.warn('⚠️ Invalid criteria selection');
      return;
    }

    this.f['subCriteria'].setValue(criteriaId);
    this.selectedSubCriteriaTitle = criteriaName;
    this.subSearchTerm = '';
    this.filteredSubCriteria = [...this.subCriteriaList];
    this.showSubDropdown = false;
    this.f['subCriteria'].setErrors(null);
    this.f['subCriteria'].markAsTouched();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.search-dropdown');

    if (!clickedInside) {
      this.showMainDropdown = false;
      this.showSubDropdown = false;
    }
  }

  // ==================== وظائف مساعدة ====================

  get f() {
    return this.messageForm.controls;
  }

  showFieldError(fieldName: string): boolean {
    const field = this.f[fieldName];
    return field.invalid && (field.dirty || field.touched || this.formSubmitted);
  }

  showFormSummary(): boolean {
    return this.messageForm.invalid && this.formSubmitted && !this.submitting;
  }

  markFieldAsTouched(fieldName: string): void {
    this.f[fieldName].markAsTouched();
  }

  preventLeadingSpace(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    if (input.selectionStart === 0 && event.key === ' ') {
      event.preventDefault();
    }
  }

  onCancel() {
    if (this.messageForm.dirty) {
      Swal.fire({
        title: 'هل أنت متأكد؟',
        text: 'سيتم فقدان جميع البيانات التي أدخلتها',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'نعم، إلغاء',
        cancelButtonText: 'لا، ابقى هنا',
      }).then((result) => {
        if (result.isConfirmed) {
          this.cancel();
        }
      });
    } else {
      this.cancel();
    }
  }

  cancel() {
    this.showConfirm('تأكيد الإلغاء', 'هل تريد إلغاء العملية؟', 'question').then((result) => {
      if (result.isConfirmed) {
        this.cleanupForm();
      }
    });
  }

  private cleanupForm() {
    localStorage.removeItem('editingLetterDraft');
    this.resetForm();
  }

  private clearSavedData(): void {
    this.pdfFilename = null;
    localStorage.removeItem('editingLetterDraft');
    localStorage.removeItem('currentDraftId');
  }

  private resetForm(): void {
    this.contentFields.clear();
    this.rationaleFields.clear();
    this.tablesArray.clear();

    this.messageForm.reset({
      mainCriteria: '',
      subCriteria: '',
      title: '',
      signatureType: '',
      fullName: '',
      entityName: '',
      nationalId: '',
      phoneNumber: '',
      startDate: '',
      endDate: '',
      date: new Date().toISOString().split('T')[0],
    });

    this.contentFields.push(this.createContentField());
    this.rationaleFields.push(this.createRationaleField());

    this.submitting = false;
    this.loadingSubCriteria = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.formSubmitted = false;
    this.mainSearchTerm = '';
    this.subSearchTerm = '';
    this.selectedMainCriteriaTitle = '';
    this.selectedSubCriteriaTitle = '';
    this.filteredMainCriteria = [];
    this.filteredSubCriteria = [];
    this.showMainDropdown = false;
    this.showSubDropdown = false;

    // مسح بيانات PDF المحفوظة
    this.clearSavedData();

    // إعادة تعيين متغيرات المسودة
    this.isEditingDraft = false;
    this.draftId = null;
    this.originalDraftData = null;

    Object.keys(this.f).forEach((key) => {
      this.f[key].markAsUntouched();
    });
  }

  private showSuccess(message: string): void {
    Swal.fire({
      icon: 'success',
      title: message,
      showConfirmButton: false,
      timer: 1500,
    });
  }

  private showError(message: string): void {
    Swal.fire({
      icon: 'error',
      title: message,
      showConfirmButton: false,
      timer: 1500,
    });
  }

  private showWarning(message: string): void {
    Swal.fire({
      icon: 'warning',
      title: message,
      showConfirmButton: false,
      timer: 2000,
    });
  }

  private showConfirm(title: string, text: string, icon: any): Promise<any> {
    return Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء',
    });
  }

  ngOnDestroy(): void {
    // تنظيف localStorage عند تدمير المكون
    this.clearSavedData();
  }
}
