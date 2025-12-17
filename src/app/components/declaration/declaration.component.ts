import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, FormArray } from '@angular/forms';
import { MainCriteria, SubCriteria } from 'src/app/model/criteria';
import { CriteriaService } from 'src/app/service/criteria.service';
import { LetterService } from 'src/app/service/letter.service';
import { LoginService } from 'src/app/service/login.service';
import Swal from 'sweetalert2';

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
  // 🔥 تم إزالة showAssignmentFields

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'align': [] }],
      [{ 'direction': 'rtl' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ]
  };

  defaultRationales: string[] = [
    'بعد الاطلاع على القانون رقم ٤٩ لسنة ١٩٧٢م في شأن تنظيم الجامعات في جمهورية مصر العربية ولائحته التنفيذية وتعديلاتهما.',
    'وعلى القانون رقم (١٤٢) لسنة ١٩٩٤م. بشأن تعديل بعض أحكام قانون تنظيم الجامعات رقم ٤٩ لسنة ١٩٧٢ م.',
    'وعلى قرار رئيس الجمهورية بالقانون رقم (٥٢) لسنة ٢٠١٤م بشأن تعديل بعض أحكام قانون تنظيم الجامعات رقم ٤٩ لسنة ١٩٧٢ م.'
  ];

  constructor(
    private fb: FormBuilder,
    private criteriaService: CriteriaService,
    private letterService: LetterService,
    private loginService: LoginService
  ) { }

  user = this.loginService.getUserFromLocalStorage();

  ngOnInit(): void {
    this.initializeForm();
    this.loadMainCriteria();
    this.populateDefaultRationales();
  }

  private initializeForm(): void {
    this.messageForm = this.fb.group(
      {
        mainCriteria: ['', [Validators.required]],
        subCriteria: ['', [Validators.required]],
        title: ['', [Validators.required, noLeadingSpaces]],
        rationaleFields: this.fb.array([]),
        signatureType: [''],
        contentFields: this.fb.array([this.createContentField()]),
        // 🔥 حقول التعيين بدون validators مطلوبة (كلها اختيارية)
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
        // 🔥 تم إزالة checkIfAssignmentCriteria
      } else {
        this.subCriteriaList = [];
        this.filteredSubCriteria = [];
        this.messageForm.get('subCriteria')?.setValue('');
        this.selectedSubCriteriaTitle = '';
      }
    });
  }

  // 🔥 تم إزالة checkIfAssignmentCriteria method

  private populateDefaultRationales(): void {
    this.rationaleFields.clear();

    if (this.defaultRationales && this.defaultRationales.length > 0) {
      this.defaultRationales.forEach(rationale => {
        const rationaleGroup = this.fb.group({
          rationale: [rationale, [Validators.required]],
          isDefault: [true]
        });
        this.rationaleFields.push(rationaleGroup);
      });
    } else {
      this.addRationaleField();
    }
  }

  createRationaleField(): FormGroup {
    return this.fb.group({
      rationale: ['', [Validators.required]],
      isDefault: [false]
    });
  }

  get rationaleFields(): FormArray {
    return this.messageForm.get('rationaleFields') as FormArray;
  }

  addRationaleField(): void {
    this.rationaleFields.push(this.createRationaleField());
  }

  removeRationaleField(index: number): void {
    const rationaleControl = this.rationaleFields.at(index);
    const isDefault = rationaleControl.get('isDefault')?.value;

    if (isDefault) {
      Swal.fire({
        icon: 'warning',
        title: 'لا يمكن حذف الحيثيات الافتراضية',
        text: 'يمكنك فقط تعديلها',
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    if (this.rationaleFields.length > 1) {
      this.rationaleFields.removeAt(index);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'يجب أن يحتوي القرار على حيثيات واحدة على الأقل',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  }

  createContentField(): FormGroup {
    return this.fb.group({
      content: ['', [Validators.required]]
    });
  }

  get contentFields(): FormArray {
    return this.messageForm.get('contentFields') as FormArray;
  }

  addContentField(): void {
    this.contentFields.push(this.createContentField());
  }

  removeContentField(index: number): void {
    if (this.contentFields.length > 1) {
      this.contentFields.removeAt(index);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'يجب أن يحتوي القرار على نص واحد على الأقل',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  }

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
        console.log('✅ Loaded main criteria:', criteria.length, 'items');
      },
      error: (err) => {
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

    console.log('🔄 Loading sub criteria for main criteria:', mainCriteriaId);

    this.criteriaService.getSubCriteriaById(mainCriteriaId).subscribe({
      next: (criteria: SubCriteria[]) => {
        if (Array.isArray(criteria)) {
          this.subCriteriaList = criteria;
          this.filteredSubCriteria = [...criteria];
          console.log('✅ Loaded sub criteria:', criteria.length, 'items');
          console.log('📋 Sub criteria data:', criteria);
        } else {
          console.warn('⚠️ Received non-array response:', criteria);
          this.subCriteriaList = [];
          this.filteredSubCriteria = [];
        }
        this.loadingSubCriteria = false;
      },
      error: (err) => {
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

    console.log('✅ Main criteria selected:', criteriaName);
  }

  openSubDropdown(): void {
    if (!this.f['mainCriteria'].value) {
      this.showWarning('يرجى اختيار المعيار الرئيسي أولاً');
      return;
    }
    this.showSubDropdown = true;
    this.filteredSubCriteria = [...this.subCriteriaList];
    console.log('🔍 Opening sub dropdown with', this.filteredSubCriteria.length, 'items');
  }

  toggleSubDropdown(): void {
    if (!this.f['mainCriteria'].value) {
      this.showWarning('يرجى اختيار المعيار الرئيسي أولاً');
      return;
    }

    this.showSubDropdown = !this.showSubDropdown;

    if (this.showSubDropdown) {
      this.filteredSubCriteria = [...this.subCriteriaList];
      console.log('🔍 Opening sub dropdown with', this.filteredSubCriteria.length, 'items');
    }
  }

  clearSubCriteria(event: Event): void {
    event.stopPropagation();
    this.f['subCriteria'].setValue('');
    this.selectedSubCriteriaTitle = '';
    this.subSearchTerm = '';
    this.filteredSubCriteria = [...this.subCriteriaList];
    console.log('🗑️ Sub criteria cleared');
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

    console.log('🔍 Filtered sub criteria:', this.filteredSubCriteria.length, 'items');
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

    console.log('✅ Sub criteria selected:', criteriaName);
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
          this.resetForm();
        }
      });
    } else {
      this.resetForm();
    }
  }

 private resetForm(): void {

  // 1️⃣ امسح الـ FormArray قبل reset
  this.contentFields.clear();
  this.rationaleFields.clear();

  // 2️⃣ اعمل reset بقيم STRING مش null
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

  // 3️⃣ أضف Quill بقيم فاضية
  this.contentFields.push(
    this.fb.group({
      content: ['']
    })
  );

  this.populateDefaultRationales();

  // 4️⃣ reset UI state
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

  Object.keys(this.f).forEach((key) => {
    this.f[key].markAsUntouched();
  });
}

  onSubmit() {
    this.formSubmitted = true;

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
      this.showWarning('يرجى تصحيح الأخطاء في النموذج قبل الإرسال');
      return;
    }

    this.submitting = true;
    this.successMsg = '';
    this.errorMsg = '';

    const contentTexts = this.contentFields.controls.map(control => {
      const htmlContent = control.get('content')?.value || '';
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const rationaleTexts = this.rationaleFields.controls.map(control => {
      const htmlContent = control.get('rationale')?.value || '';
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const payload: any = {
      title: this.f['title'].value,
      descriptions: contentTexts,
      mainCriteria: this.f['mainCriteria'].value,
      subCriteria: this.f['subCriteria'].value,
      Rationale: rationaleTexts,
      signatureType: this.f['signatureType'].value,
      date: new Date().toISOString().split('T')[0],
      StartDate: this.f['startDate'].value
        ? new Date(this.f['startDate'].value).toISOString()
        : null,
      EndDate: this.f['endDate'].value
        ? new Date(this.f['endDate'].value).toISOString()
        : null,
      // 🔥 إرسال حقول التعيين دائماً (حتى لو فارغة)
      fullName: this.f['fullName'].value || null,
      entityName: this.f['entityName'].value || null,
      nationalId: this.f['nationalId'].value || null,
      phoneNumber: this.f['phoneNumber'].value || null,
    };

    this.letterService.addLetterType(payload).subscribe({
      next: (res) => {
        if (this.user?.role === 'UniversityPresident') {
          this.showSuccess('تم اعتماد القرار');
        } else {
          this.showSuccess('تم إرسال القرار بنجاح');
        }
        this.resetForm();
        this.submitting = false;
      },
      error: (err) => {
        console.error('❌ Error saving letter:', err);
        this.showError('حدث خطأ أثناء إرسال القرار');
        this.submitting = false;
      },
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
}