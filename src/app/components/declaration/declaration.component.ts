import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, FormArray } from '@angular/forms';
import { Decision } from 'src/app/model/decision';
import { DecisionService } from 'src/app/service/decision.service';
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

export function validMessageTypeValidator(messageTypes: { _id: string; title: string }[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return { required: true };
    }
    const selectedTypeId = control.value;
    const isValidType = messageTypes.some((type) => type._id === selectedTypeId);
    if (!isValidType) {
      return { invalidType: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-declaration',
  templateUrl: './declaration.component.html',
  styleUrls: ['./declaration.component.css'],
})
export class DeclarationComponent implements OnInit {
  messageForm!: FormGroup;
  messageTypes: { _id: string; title: string }[] = [];
  filteredMessageTypes: { _id: string; title: string }[] = [];
  submitting = false;
  successMsg = '';
  errorMsg = '';
  formSubmitted = false;
  searchTerm = '';
  showDropdown = false;
  selectedTypeTitle = '';
  
  // ⭐ إعدادات Quill Editor
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],        // تنسيق النص
      [{ 'align': [] }],                      // محاذاة
      [{ 'direction': 'rtl' }],               // اتجاه RTL للعربي
      [{ 'list': 'ordered'}, { 'list': 'bullet' }], // قوائم
      ['clean']                               // إزالة التنسيق
    ]
  };

  // الحيثيات الافتراضية الثابتة في الفرونت
  defaultRationales: string[] = [
    'بعد الاطلاع على القانون رقم ٤٩ لسنة ١٩٧٢م في شأن تنظيم الجامعات في جمهورية مصر العربية ولائحته التنفيذية وتعديلاتهما.',
    'وعلى القانون رقم (١٤٢) لسنة ١٩٩٤م. بشأن تعديل بعض أحكام قانون تنظيم الجامعات رقم ٤٩ لسنة ١٩٧٢ م.',
    'وعلى قرار رئيس الجمهورية بالقانون رقم (٥٢) لسنة ٢٠١٤م بشأن تعديل بعض أحكام قانون تنظيم الجامعات رقم ٤٩ لسنة ١٩٧٢ م.'
  ];

  constructor(
    private fb: FormBuilder,
    private declService: DecisionService,
    private letterService: LetterService,
    private loginService: LoginService
  ) {}

  user = this.loginService.getUserFromLocalStorage();

  ngOnInit(): void {
    this.initializeForm();
    this.loadMessageTypes();
    this.populateDefaultRationales();
  }

  private initializeForm(): void {
    this.messageForm = this.fb.group(
      {
        type: ['', [Validators.required]],
        title: ['', [Validators.required, noLeadingSpaces]],
        rationaleFields: this.fb.array([]),
        signatureType: [''],
        contentFields: this.fb.array([this.createContentField()]),
        startDate: ['', [dateValidator()]],
        endDate: ['', [dateValidator()]],
        date: [{ value: new Date().toISOString().split('T')[0], disabled: true }],
      },
      { validators: endDateAfterStartValidator('startDate', 'endDate') }
    );
  }

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

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      if (this.searchTerm) {
        this.filterMessageTypes(this.searchTerm);
      } else {
        this.filteredMessageTypes = [...this.messageTypes];
      }
    }
  }

  private loadMessageTypes(): void {
    this.declService.getDecisionTypes().subscribe({
      next: (types: Decision[]) => {
        this.messageTypes = types.map((t) => ({
          _id: t._id || '',
          title: t.title || '',
        }));
        this.filteredMessageTypes = [];
        this.updateTypeValidator();
      },
      error: (err) => {
        console.error('Error loading message types:', err);
        this.showError('حدث خطأ في تحميل أنواع القرارت');
      },
    });
  }

  private updateTypeValidator(): void {
    const typeControl = this.messageForm.get('type');
    if (typeControl) {
      typeControl.setValidators([
        Validators.required,
        validMessageTypeValidator(this.messageTypes),
      ]);
      typeControl.updateValueAndValidity();
    }
  }

  filterMessageTypes(searchTerm: string): void {
    this.searchTerm = searchTerm;
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredMessageTypes = [...this.messageTypes];
    } else {
      this.filteredMessageTypes = this.messageTypes.filter((type) =>
        type.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }

  selectMessageType(typeId: string, typeTitle: string): void {
    this.f['type'].setValue(typeId);
    this.selectedTypeTitle = typeTitle;
    this.f['signatureType'].setValue(null);
    this.searchTerm = '';
    this.filteredMessageTypes = [];
    this.showDropdown = false;
    this.f['type'].setErrors(null);
    this.f['type'].markAsTouched();
  }

  validateSearchInput(): void {
    if (this.searchTerm && !this.f['type'].value) {
      this.f['type'].setErrors({ invalidType: true });
    }
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showDropdown = false;
      this.validateSearchInput();
    }, 200);
  }

  onSearchFocus(): void {
    if (this.searchTerm && this.filteredMessageTypes.length > 0) {
      this.showDropdown = true;
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
    this.messageForm.reset({
      date: new Date().toISOString().split('T')[0],
    });
    
    this.contentFields.clear();
    this.contentFields.push(this.createContentField());
    
    this.populateDefaultRationales();
    
    this.submitting = false;
    this.successMsg = '';
    this.errorMsg = '';
    this.formSubmitted = false;
    this.searchTerm = '';
    this.selectedTypeTitle = '';
    this.filteredMessageTypes = [];
    this.showDropdown = false;
    Object.keys(this.f).forEach((key) => {
      this.f[key].markAsUntouched();
    });
  }

  onSubmit() {
    this.formSubmitted = true;
    this.validateSearchInput();
    
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

    // ⭐ إرسال HTML كامل للـ Backend (بدون حذف التاجات)
    const contentTexts = this.contentFields.controls.map(control => {
      const htmlContent = control.get('content')?.value || '';
      // فقط تنظيف المسافات الزائدة وترك HTML كما هو
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const rationaleTexts = this.rationaleFields.controls.map(control => {
      const htmlContent = control.get('rationale')?.value || '';
      return htmlContent.trim();
    }).filter(text => text.length > 0);

    const payload = {
      title: this.f['title'].value,
      descriptions: contentTexts, // ⭐ HTML كامل
      decision: this.f['type'].value,
      Rationale: rationaleTexts, // ⭐ HTML كامل
      signatureType: this.f['signatureType'].value,
      date: new Date().toISOString().split('T')[0],
      StartDate: this.f['startDate'].value
        ? new Date(this.f['startDate'].value).toISOString()
        : null,
      EndDate: this.f['endDate'].value
        ? new Date(this.f['endDate'].value).toISOString()
        : null,
    };

    this.letterService.addLetterType(payload).subscribe({
      next: (res) => {
        if(this.user?.role === 'UniversityPresident'){
          this.showSuccess('تم اعتماد القرار');
        }else{
          this.showSuccess('تم ارسال القرار بنجاح');
        }
        this.resetForm();
        this.submitting = false;
      },
      error: (err) => {
        console.error('Error saving letter:', err);
        this.showError('حدث خطأ أثناء ارسال القرار');
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