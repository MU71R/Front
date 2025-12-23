import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { ArchiveService } from 'src/app/service/archive.service';
import { LoginService } from 'src/app/service/login.service';
import { LetterService } from 'src/app/service/letter.service';
import { AuthService } from 'src/app/service/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-letter-detail',
  templateUrl: './letter-detail.component.html',
  styleUrls: ['./letter-detail.component.css'],
})
export class LetterDetailComponent implements OnInit {
  form!: FormGroup;
  original: any = null;
  loading = true;
  processing = false;
  isEditing = false;
  currentUserRole: string = '';
  showPresidentOptions = false;
  showAmendmentReason = false;
  amendmentReason = '';

  pdfUrl: string | null = null;
  pdfFilename: string | null = null;
  pdfFile: any = null;
  pdfLoading = false;
  pdfGenerating = false;
  pdfSearching = false;
  pdfSearchAttempted = false;

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      ['clean']
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private archiveService: ArchiveService,
    private loginService: LoginService,
    private letterService: LetterService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) { }

  user = this.authService.currentUserValue;

  get descriptionsArray(): FormArray {
    return this.form.get('descriptions') as FormArray;
  }

  get rationalesArray(): FormArray {
    return this.form.get('rationales') as FormArray;
  }

  getDescriptionControl(index: number): FormControl {
    return this.descriptionsArray.at(index) as FormControl;
  }

  getRationaleControl(index: number): FormControl {
    return this.rationalesArray.at(index) as FormControl;
  }

  ngOnInit(): void {
    this.initForm();
    this.getCurrentUserRole();

    const letterId = this.route.snapshot.paramMap.get('id');
    if (letterId) {
      this.loadLetter(letterId);
    }
  }

  private initForm() {
    this.form = this.fb.group({
      title: [''],
      startDate: [''],
      endDate: [''],
      fullName: [''],
      entityName: [''],
      nationalId: [''],
      phoneNumber: [''],
      descriptions: this.fb.array([]),
      rationales: this.fb.array([])
    });
  }

  private getCurrentUserRole(): void {
    const user = this.loginService.getUserFromLocalStorage();
    if (user && user.role) {
      this.currentUserRole = user.role === 'UniversityPresident' ? 'UniversityPresident' : 'supervisor';
    } else {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          this.currentUserRole = parsedUser.role || '';
        } catch (e) {
          console.error('خطأ في قراءة بيانات المستخدم:', e);
        }
      }
    }
  }

  formatDateForInput(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  getArabicOrdinal(index: number): string {
    const ordinals = [
      'أولاً', 'ثانياً', 'ثالثاً', 'رابعاً', 'خامساً',
      'سادساً', 'سابعاً', 'ثامناً', 'تاسعاً', 'عاشراً',
      'حادي عشر', 'ثاني عشر', 'ثالث عشر', 'رابع عشر', 'خامس عشر',
      'سادس عشر', 'سابع عشر', 'ثامن عشر', 'تاسع عشر', 'عشرون',
      'الواحد والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون',
      'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون',
    ];
    return ordinals[index] || `${index + 1}`;
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  addDescription() {
    this.descriptionsArray.push(this.fb.control(''));
    this.cdr.detectChanges();
  }

  removeDescription(index: number) {
    if (this.descriptionsArray.length > 1) {
      this.descriptionsArray.removeAt(index);
      this.cdr.detectChanges();
    }
  }

  addRationale() {
    this.rationalesArray.push(this.fb.control(''));
    this.cdr.detectChanges();
  }

  removeRationale(index: number) {
    if (this.rationalesArray.length > 1) {
      this.rationalesArray.removeAt(index);
      this.cdr.detectChanges();
    }
  }

  loadLetter(id: string) {
    this.loading = true;

    this.letterService.getLetter(id).subscribe({
      next: (res) => {
        if (!res) {
          this.loading = false;
          return;
        }

        this.original = res;

        // إعادة تهيئة الفورم عند تحميل القرار أول مرة
        this.initForm();

        // تحميل البنود والحيثيات في الفورم (للعرض فقط، مش edit)
        this.loadDescriptionsIntoForm();
        this.loadRationalesIntoForm();

        this.form.patchValue({
          title: this.original?.title || '',
          startDate: this.formatDateForInput(this.original?.StartDate),
          endDate: this.formatDateForInput(this.original?.EndDate),
          fullName: this.original?.fullName || '',
          entityName: this.original?.entityName || '',
          nationalId: this.original?.nationalId || '',
          phoneNumber: this.original?.phoneNumber || ''
        });

        this.loadPdfByLetterId(id);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('خطأ في تحميل القرار:', err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ أثناء تحميل القرار',
          showConfirmButton: true
        });
      }
    });
  }

  private loadDescriptionsIntoForm() {
    this.descriptionsArray.clear();
    const descriptions = this.original?.descriptions || [];
    if (Array.isArray(descriptions) && descriptions.length > 0) {
      descriptions.forEach((desc: any) => {
        const cleanDesc = desc?.toString().trim() || '';
        if (cleanDesc) this.descriptionsArray.push(this.fb.control(cleanDesc));
      });
    }
    if (this.descriptionsArray.length === 0) this.descriptionsArray.push(this.fb.control(''));
  }

  private loadRationalesIntoForm() {
    this.rationalesArray.clear();
    let rationales = [];
    if (this.original?.Rationale) {
      if (Array.isArray(this.original.Rationale)) rationales = this.original.Rationale;
      else if (typeof this.original.Rationale === 'string') rationales = [this.original.Rationale];
      else if (typeof this.original.Rationale === 'object') rationales = Object.values(this.original.Rationale);
    }
    if (rationales.length > 0) {
      rationales.forEach((rat: any) => {
        const cleanRat = rat?.toString().trim() || '';
        if (cleanRat) this.rationalesArray.push(this.fb.control(cleanRat));
      });
    }
    if (this.rationalesArray.length === 0) this.rationalesArray.push(this.fb.control(''));
  }

  enableEdit() {
    console.log('======= Enabling Edit Mode =======');
    this.isEditing = true;

    this.descriptionsArray.clear();
    this.rationalesArray.clear();

    this.loadDescriptionsIntoForm();
    this.loadRationalesIntoForm();

    this.form.patchValue({
      title: this.original?.title || '',
      startDate: this.formatDateForInput(this.original?.StartDate),
      endDate: this.formatDateForInput(this.original?.EndDate),
      fullName: this.original?.fullName || '',
      entityName: this.original?.entityName || '',
      nationalId: this.original?.nationalId || '',
      phoneNumber: this.original?.phoneNumber || ''
    });

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  cancelEdit() {
    console.log('Canceling edit mode');
    this.isEditing = false;
    this.loadLetter(this.original._id);
    this.cdr.detectChanges();
  }

  private loadPdfByLetterId(letterId: string) {
    this.pdfSearching = true;
    this.pdfSearchAttempted = true;

    this.letterService.getPDFbyLetterId(letterId).subscribe({
      next: (response) => {
        this.pdfSearching = false;
        if (response.success && response.pdfFile) {
          this.pdfFile = response.pdfFile;
          this.pdfUrl = response.pdfFile.pdfurl;
          this.pdfFilename = this.extractFilenameFromUrl(response.pdfFile.pdfurl);
        } else {
          this.findAndSetPdfUrl();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pdfSearching = false;
        console.error('خطأ في جلب PDF:', err);
        this.findAndSetPdfUrl();
        this.cdr.detectChanges();
      },
    });
  }

  private findAndSetPdfUrl() {
    if (this.original?.pdfUrl) {
      this.pdfUrl = this.original.pdfUrl;
      this.pdfFilename = this.extractFilenameFromUrl(this.original.pdfUrl);
      return;
    }

    if (this.original?.approvals && this.original.approvals.length > 0) {
      const presidentApproval = this.original.approvals.find(
        (approval: any) =>
          approval.role === 'UniversityPresident' && approval.approved === true
      );

      if (presidentApproval) {
        this.generatePdfFilenameFromLetterData();
        return;
      }
    }

    this.checkForPdfInServer();
  }

  private generatePdfFilenameFromLetterData() {
    if (!this.original) return;

    const letterId = this.original._id;
    const title = this.original.title
      ? this.original.title.replace(/[^\w\u0600-\u06FF]/g, '_')
      : 'قرار';

    this.pdfFilename = `letter_${letterId}_${title}.pdf`;
  }

  private checkForPdfInServer() {
    if (!this.original?._id) return;
    this.generatePdfFilenameFromLetterData();
  }

  private extractFilenameFromUrl(url: string): string {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  private generateDownloadName(): string {
    const title = this.original?.title
      ? this.original.title.replace(/[^\w\u0600-\u06FF]/g, '_')
      : 'قرار';
    const date = this.original?.date
      ? new Date(this.original.date).toISOString().split('T')[0]
      : '';
    return `قرار_${title}_${date}.pdf`;
  }

  handlePdfAction(): void {
    if (this.pdfUrl) {
      this.openPdf();
    }
  }

  getPdfButtonIcon(): string {
    if (this.pdfLoading || this.pdfGenerating || this.pdfSearching) {
      return 'bi-arrow-clockwise spin';
    }
    return this.pdfUrl ? 'bi-file-pdf' : 'bi-file-earmark-plus';
  }

  getPdfButtonText(): string {
    if (this.pdfLoading) return 'جاري التحميل...';
    if (this.pdfGenerating) return 'جاري الإنشاء...';
    if (this.pdfSearching) return 'جاري البحث...';
    return this.pdfUrl ? 'عرض PDF' : 'إنشاء PDF';
  }

  getViewButtonIcon(): string {
    return this.pdfLoading ? 'bi-arrow-clockwise spin' : 'bi-eye';
  }

  getViewButtonText(): string {
    return this.pdfLoading ? 'جاري التحميل...' : 'عرض PDF';
  }

  generatePdf(signatureType: 'حقيقية' | 'الممسوحة ضوئيا') {
    if (!this.original?._id) return;

    this.pdfGenerating = true;

    this.letterService
      .printLetterByType(this.original._id, signatureType)
      .subscribe({
        next: (res) => {
          this.pdfGenerating = false;
          this.pdfUrl = res.pdfUrl;
          this.pdfFilename = this.extractFilenameFromUrl(res.pdfUrl);
          this.savePdfUrlToDatabase(res.pdfUrl);
        },
        error: () => {
          this.pdfGenerating = false;
        }
      });
  }

  generateTestingPdf(): void {
    if (!this.original?._id) return;

    this.pdfGenerating = true;

    this.letterService.printTestingPdf(this.original._id).subscribe({
      next: (res) => {
        this.pdfGenerating = false;
        this.pdfUrl = res.pdfUrl;
        this.pdfFilename = this.extractFilenameFromUrl(res.pdfUrl);

        Swal.fire({
          icon: 'info',
          title: 'نسخة تجريبية',
          text: 'يمكن إنشاؤها عدة مرات'
        });
      },
      error: () => {
        this.pdfGenerating = false;
      }
    });
  }

  openPdfTesting(): void {
    if (!this.pdfUrl) return;

    this.pdfLoading = true;
    if (this.pdfUrl.startsWith('http')) {
      window.open(this.pdfUrl, '_blank');
      this.pdfLoading = false;
    } else if (this.pdfFilename) {
      const baseUrl = 'http://localhost:3000/generated-files/testing';
      const pdfUrl = `${baseUrl}/${encodeURIComponent(this.pdfFilename)}`;
      window.open(pdfUrl, '_blank');
      this.pdfLoading = false;
    } else {
      this.pdfLoading = false;
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف PDF متاح للعرض',
        showConfirmButton: true
      });
    }
  }

  openPdf(): void {
    if (!this.pdfUrl) return;

    this.pdfLoading = true;
    if (this.pdfUrl.startsWith('http')) {
      window.open(this.pdfUrl, '_blank');
      this.pdfLoading = false;
    } else if (this.pdfFilename) {
      const baseUrl = 'http://localhost:3000/generated-files';
      const pdfUrl = `${baseUrl}/${encodeURIComponent(this.pdfFilename)}`;
      window.open(pdfUrl, '_blank');
      this.pdfLoading = false;
    } else {
      this.pdfLoading = false;
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف PDF متاح للعرض',
        showConfirmButton: true
      });
    }
  }

  downloadPdf() {
    if (this.pdfFilename) {
      const downloadName = this.generateDownloadName();
      this.letterService.downloadPDF(this.pdfFilename, downloadName);
    } else if (this.pdfUrl) {
      const link = document.createElement('a');
      link.href = this.pdfUrl;
      link.download = this.generateDownloadName();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف PDF متاح للتنزيل',
        showConfirmButton: true
      });
    }
  }

  getApprovalUserName(approval: any): string {
    if (approval.user?.fullname) return approval.user.fullname;
    if (approval.user?.name) return approval.user.name;
    if (approval.role === 'supervisor') {
      return this.original?.decision?.supervisor?.fullname || 'المشرف';
    }
    return approval.role === 'UniversityPresident' ? 'رئيس الجامعة' : 'مستخدم';
  }

  getApprovalRoleText(role: string): string {
    const roleMap: { [key: string]: string } = {
      supervisor: 'المراجع',
      UniversityPresident: 'رئيس الجامعة',
      user: 'المستخدم',
    };
    return roleMap[role] || role;
  }

  stripHtml(html: string): string {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  renderHtml(html: string): string {
    return html || '';
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  saveChanges() {
    console.log('======= Saving Changes =======');
    console.log('Current form descriptions:', this.descriptionsArray.value);
    console.log('Current form rationales:', this.rationalesArray.value);

    // Filter out empty descriptions/rationales
    const cleanedDescriptions = this.descriptionsArray.value
      .map((desc: string) => desc?.toString().trim() || '')
      .filter((desc: string) => desc !== '');

    const cleanedRationales = this.rationalesArray.value
      .map((rationale: string) => rationale?.toString().trim() || '')
      .filter((rationale: string) => rationale !== '');

    console.log('Cleaned descriptions:', cleanedDescriptions);
    console.log('Cleaned rationales:', cleanedRationales);

    // Construct the payload with specific fields only
    const payload: Partial<any> = {
      title: this.form.value.title || this.original.title,
      fullName: this.form.value.fullName || null,
      entityName: this.form.value.entityName || null,
      nationalId: this.form.value.nationalId || null,
      phoneNumber: this.form.value.phoneNumber || null,
      descriptions: cleanedDescriptions,
      Rationale: cleanedRationales,
    };

    if (this.form.value.startDate) {
      payload['StartDate'] = new Date(this.form.value.startDate).toISOString();
    }

    if (this.form.value.endDate) {
      payload['EndDate'] = new Date(this.form.value.endDate).toISOString();
    }

    console.log('Sending Payload:', JSON.stringify(payload, null, 2));

    this.processing = true;

    this.letterService.updateLetter(this.original._id, payload).subscribe({
      next: (updatedLetter) => {
        // Update local object cautiously
        this.original = {
          ...this.original,
          ...payload,
          descriptions: cleanedDescriptions,
          Rationale: cleanedRationales
        };

        // If the backend returned a Full object, consider using it
        if (updatedLetter && updatedLetter._id) {
          console.log('Backend returned updated object:', updatedLetter);
          // Update specific fields from backend response if needed, 
          // but keeping local state usually feels faster. 
          // Usually it's better to trust the server response for the single source of truth:
          // this.original = updatedLetter; 
          // However, if updatedLetter is not fully populated (e.g. user field), we might lose display data.
          // So merging is safer.
        }

        this.isEditing = false;
        this.processing = false;

        Swal.fire({
          icon: 'success',
          title: 'تم الحفظ بنجاح',
          showConfirmButton: false,
          timer: 1500
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Save error:', err);
        this.processing = false;
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ أثناء الحفظ',
          text: err.error?.message || 'يرجى المحاولة مرة أخرى',
          showConfirmButton: true
        });
      }
    });
  }

  onRationaleChange() {
    this.form.controls['rationale'].setValue(
      this.stripHtml(this.form.value.rationale || ''),
      { emitEvent: false }
    );
  }

  showAmendmentForm() {
    this.showAmendmentReason = true;
    this.amendmentReason = '';
  }

  cancelAmendment() {
    this.showAmendmentReason = false;
    this.amendmentReason = '';
  }

  confirmAmendment() {
    if (!this.amendmentReason.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'يرجى إدخال سبب التعديل',
        showConfirmButton: false,
        timer: 1500
      });
      return;
    }

    this.processing = true;

    const updateData: any = {
      status: 'amendment',
      reasonForRejection: this.amendmentReason,
    };

    if (this.isEditing) {
      const cleanedDescriptions = this.descriptionsArray.value
        .map((desc: string) => desc.trim())
        .filter((desc: string) => desc !== '');
      const cleanedRationales = this.rationalesArray.value
        .map((rationale: string) => rationale.trim())
        .filter((rationale: string) => rationale !== '');

      updateData.Rationale = cleanedRationales;
      updateData.title = this.form.value.title;
      updateData.descriptions = cleanedDescriptions;
    }

    let amendmentObservable;

    if (this.currentUserRole === 'supervisor') {
      amendmentObservable = this.letterService.updateStatusBySupervisor(
        this.original._id,
        'amendment',
        this.amendmentReason,
        this.isEditing ? updateData : undefined
      );
    } else {
      amendmentObservable = this.letterService.updateStatusByUniversityPresident(
        this.original._id,
        'amendment',
        this.amendmentReason,
        this.isEditing ? updateData : undefined
      );
    }

    amendmentObservable.subscribe({
      next: (res: any) => {
        this.original.status = 'amendment';
        this.original.reasonForRejection = this.amendmentReason;

        if (this.isEditing) {
          this.original.Rationale = updateData.Rationale;
          this.original.title = this.form.value.title;
          this.original.descriptions = updateData.descriptions;
          this.isEditing = false;
        }

        this.showAmendmentReason = false;
        this.amendmentReason = '';
        this.processing = false;

        Swal.fire({
          icon: 'success',
          title: 'تم إرسال القرار للتعديل',
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (err) => {
        console.error('خطأ في إرسال التعديل:', err);
        this.processing = false;
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ أثناء إرسال التعديل',
          showConfirmButton: true
        });
      }
    });
  }

  confirmFinalRejection() {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم رفض القرار نهائياً',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، رفض',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processing = true;

        let rejectionObservable;

        if (this.currentUserRole === 'supervisor') {
          rejectionObservable = this.letterService.updateStatusBySupervisor(
            this.original._id,
            'rejected',
            '',
            undefined
          );
        } else {
          rejectionObservable = this.letterService.updateStatusByUniversityPresident(
            this.original._id,
            'rejected',
            '',
            undefined
          );
        }

        rejectionObservable.subscribe({
          next: (res: any) => {
            this.original.status = 'rejected';
            this.processing = false;

            Swal.fire({
              icon: 'success',
              title: 'تم رفض القرار',
              showConfirmButton: false,
              timer: 1500
            });
          },
          error: (err) => {
            console.error('خطأ في رفض القرار:', err);
            this.processing = false;
            Swal.fire({
              icon: 'error',
              title: 'حدث خطأ أثناء رفض القرار',
              showConfirmButton: true
            });
          }
        });
      }
    });
  }

  approveLetter(signatureType?: 'حقيقية' | 'الممسوحة ضوئيا') {
    if (!this.original?._id) return;

    console.log('=== Approve Letter ===');
    console.log('Letter ID:', this.original._id);
    console.log('Signature Type:', signatureType);
    console.log('Current User Role:', this.currentUserRole);

    this.processing = true;

    if (this.currentUserRole === 'supervisor') {
      this.letterService
        .updateStatusBySupervisor(this.original._id, 'pending')
        .subscribe({
          next: () => {
            this.original.status = 'pending';
            this.processing = false;
            Swal.fire({
              icon: 'success',
              title: 'تم إرسال القرار للرئيس',
              showConfirmButton: false,
              timer: 1500
            });
          },
          error: (err) => {
            console.error('Error approving by supervisor:', err);
            this.processing = false;
            Swal.fire({
              icon: 'error',
              title: 'حدث خطأ أثناء الإرسال',
              showConfirmButton: true
            });
          },
        });
    } else if (this.currentUserRole === 'UniversityPresident') {
      console.log('Approving with signature type:', signatureType);

      this.letterService.updateStatusByUniversityPresident(
        this.original._id,
        'approved',
        undefined,
        signatureType
      ).subscribe({
        next: () => {
          this.original.status = 'approved';
          this.original.signatureType = signatureType;

          this.generatePdf(signatureType || 'حقيقية');

          this.processing = false;
          this.showPresidentOptions = false;

          Swal.fire({
            icon: 'success',
            title: 'تمت الموافقة وإنشاء PDF',
            timer: 2000,
            showConfirmButton: false
          });
        },
        error: (err) => {
          console.error('Error approving by president:', err);
          this.processing = false;
          Swal.fire({
            icon: 'error',
            title: 'حدث خطأ أثناء الموافقة',
            text: err.error?.message || 'حاول مرة أخرى',
            showConfirmButton: true
          });
        },
      });
    }
  }

  private savePdfUrlToDatabase(pdfUrl: string) {
    const updateData = { pdfUrl: pdfUrl };
    this.letterService.updateLetter(this.original._id, updateData).subscribe({
      next: () => {
        this.original.pdfUrl = pdfUrl;
      },
      error: (err) => {
        console.error('خطأ في حفظ رابط PDF:', err);
      },
    });
  }

  showPdfButton(): boolean {
    return true;
  }

  canShowPdf(): boolean {
    return true;
  }

  canEdit(): boolean {
    return (
      !['approved', 'rejected'].includes(this.original?.status) &&
      this.isEditingAllowedByRole()
    );
  }

  isEditingAllowedByRole(): boolean {
    if (this.currentUserRole === 'supervisor') {
      return this.original?.status === 'in_progress';
    }
    if (this.currentUserRole === 'UniversityPresident') {
      return this.original?.status === 'pending';
    }
    return false;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved': return 'badge bg-success';
      case 'pending': return 'badge bg-warning text-dark';
      case 'rejected': return 'badge bg-danger';
      case 'amendment': return 'badge bg-warning text-dark';
      case 'in_progress': return 'badge bg-info text-dark';
      default: return 'badge bg-secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'تمت الموافقة';
      case 'pending': return 'قيد المراجعة لدى الرئيس';
      case 'rejected': return 'مرفوض';
      case 'amendment': return 'قيد التعديل';
      case 'in_progress': return 'قيد المعالجة';
      default: return 'غير محدد';
    }
  }

  getStepClass(step: number): string {
    const status = this.original?.status || '';
    if (status === 'rejected') return '';

    if (status === 'in_progress' && step === 1) return 'active';
    if (status === 'pending' && step <= 2)
      return step === 2 ? 'active' : 'completed';
    if (status === 'approved' && step <= 3) return 'completed';

    return '';
  }

  showReviewActions(): boolean {
    const hasRole = this.currentUserRole === 'supervisor' || this.currentUserRole === 'UniversityPresident';
    const correctStatus =
      (this.currentUserRole === 'supervisor' && this.original?.status === 'in_progress') ||
      (this.currentUserRole === 'UniversityPresident' && this.original?.status === 'pending');

    console.log('showReviewActions:', {
      currentUserRole: this.currentUserRole,
      status: this.original?.status,
      hasRole,
      correctStatus,
      result: hasRole && correctStatus
    });

    return hasRole && correctStatus;
  }

  showRejectionDetails(): boolean {
    return (
      (this.original?.status === 'rejected' || this.original?.status === 'amendment') &&
      !!this.original?.reasonForRejection
    );
  }

  debugData() {
    console.log('======= DEBUG DATA =======');
    console.log('isEditing:', this.isEditing);
    console.log('Form valid:', this.form.valid);
    console.log('Form value:', this.form.value);
    console.log('Descriptions array length:', this.descriptionsArray.length);
    console.log('Rationales array length:', this.rationalesArray.length);
    console.log('Original data:', this.original);
  }
}