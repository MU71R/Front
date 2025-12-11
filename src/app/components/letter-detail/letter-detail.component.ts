import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { ArchiveService } from 'src/app/service/archive.service';
import { LoginService } from 'src/app/service/login.service';
import { LetterService } from 'src/app/service/letter.service';
import { Letter } from 'src/app/model/Letter';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-letter-detail',
  templateUrl: './letter-detail.component.html',
  styleUrls: ['./letter-detail.component.css'],
})
export class LetterDetailComponent implements OnInit {
  form!: FormGroup;
  original: any = null;
  previewHtml = '';
  reviewNotes = '';
  previewText: string = '';
  loading = true;
  processing = false;
  isEditing = false;
  currentUserRole: string = '';
  showPresidentOptions = false;
  showRejectionReason = false;
  showAmendmentReason = false; // جديد للتعديل
  rejectionReason = '';
  amendmentReason = ''; // جديد للتعديل
  pdfUrl: string | null = null;
  pdfFilename: string | null = null;
  pdfFile: any = null;

  pdfLoading = false;
  pdfGenerating = false;
  pdfSearching = false;
  pdfSearchAttempted = false;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private archiveService: ArchiveService,
    private loginService: LoginService,
    private letterService: LetterService
  ) { }

  get descriptionsArray(): FormArray {
    return this.form.get('descriptions') as FormArray;
  }

  get rationalesArray(): FormArray {
    return this.form.get('rationales') as FormArray;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: [''],
      rationale: [''],
      startDate: [''],
      endDate: [''],
      descriptions: this.fb.array([]),
      rationales: this.fb.array([])
    });

    const user = this.loginService.getUserFromLocalStorage();
    this.currentUserRole =
      user?.role === 'UniversityPresident'
        ? 'UniversityPresident'
        : 'supervisor';
    const letterId = this.route.snapshot.paramMap.get('id');
    if (letterId) this.loadLetter(letterId);
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
      'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'العشرون والعشرون',
    ];
    return ordinals[index] || `${index + 1}`;
  }

  addDescription() {
    this.descriptionsArray.push(this.fb.control(''));
  }

  removeDescription(index: number) {
    if (this.descriptionsArray.length > 1) {
      this.descriptionsArray.removeAt(index);
    }
  }

  addRationale() {
    this.rationalesArray.push(this.fb.control(''));
  }

  removeRationale(index: number) {
    if (this.rationalesArray.length > 1) {
      this.rationalesArray.removeAt(index);
    }
  }

  private initDescriptionsArray() {
    const descriptionsArray = this.form.get('descriptions') as FormArray;
    descriptionsArray.clear();

    if (this.original?.descriptions && this.original.descriptions.length > 0) {
      this.original.descriptions.forEach((desc: string) => {
        descriptionsArray.push(this.fb.control(desc));
      });
    } else {
      descriptionsArray.push(this.fb.control(''));
    }
  }

  private initRationalesArray() {
    const rationalesArray = this.form.get('rationales') as FormArray;
    rationalesArray.clear();

    const originalRationale = this.original?.Rationale || [];
    const rationaleList = Array.isArray(originalRationale)
      ? originalRationale
      : originalRationale.split('\n');

    if (rationaleList.length > 0) {
      rationaleList.forEach((rationale: string) => {
        rationalesArray.push(this.fb.control(rationale));
      });
    } else {
      rationalesArray.push(this.fb.control(''));
    }
  }

  loadLetter(id: string) {
    this.loading = true;
    this.letterService.getLetter(id).subscribe(
      (res: any) => {
        this.original = res.data || res;

        this.initDescriptionsArray();
        this.initRationalesArray();

        this.form.patchValue({
          title: this.original?.title || '',
          rationale: Array.isArray(this.original?.Rationale)
            ? this.original.Rationale.join('\n')
            : this.original?.Rationale || '',
          startDate: this.formatDateForInput(this.original?.StartDate),
          endDate: this.formatDateForInput(this.original?.EndDate),
        });

        this.loadPdfByLetterId(id);
        this.loading = false;
      },
      (err) => {
        console.error(err);
        this.loading = false;
      }
    );
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
      },
      error: (err) => {
        this.pdfSearching = false;
        console.error('خطأ في جلب PDF:', err);
        this.findAndSetPdfUrl();
        this.loading = false;
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

    if (this.original?.status === 'approved') {
      this.checkForPdfInServer();
    }
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
    } else {
      this.generatePdf();
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

  generatePdf(): void {
    if (!this.original?._id) return;

    this.pdfGenerating = true;
    this.letterService.generateOfficialLetterPDF(this.original._id).subscribe({
      next: (result) => {
        this.pdfGenerating = false;
        if (result.pdfUrl) {
          this.pdfUrl = result.pdfUrl;
          this.pdfFilename = this.extractFilenameFromUrl(result.pdfUrl);
          this.savePdfUrlToDatabase(result.pdfUrl);
          this.loadPdfByLetterId(this.original._id);
        }
      },
      error: (err) => {
        this.pdfGenerating = false;
        console.error('خطأ في إنشاء PDF:', err);
        alert('حدث خطأ أثناء إنشاء PDF');
      },
    });
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
      alert('لا يوجد ملف PDF متاح للعرض');
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
      alert('لا يوجد ملف PDF متاح للتنزيل');
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

  enableEdit() {
    this.isEditing = true;
    this.initDescriptionsArray();
    this.form.patchValue({
      rationale: this.original?.Rationale || '',
      title: this.original?.title || '',
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.form.patchValue({
      title: this.original?.title,
      rationale: this.original?.Rationale,
    });
    this.initDescriptionsArray();
  }

  stripHtml(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  saveChanges() {
    const cleanedDescriptions = this.descriptionsArray.value
      .map((desc: string) => desc.trim())
      .filter((desc: string) => desc !== '');
    const cleanedRationales = this.rationalesArray.value
      .map((rationale: string) => rationale.trim())
      .filter((rationale: string) => rationale !== '');

    const payload = {
      ...this.original,
      StartDate: this.form.value.startDate
        ? new Date(this.form.value.startDate).toISOString()
        : null,
      EndDate: this.form.value.endDate
        ? new Date(this.form.value.endDate).toISOString()
        : null,
      Rationale: cleanedRationales.length > 0 ? cleanedRationales.join('\n') : '',
      descriptions: cleanedDescriptions
    };

    this.processing = true;
    this.letterService.updateLetter(this.original._id, payload).subscribe({
      next: (res) => {
        this.original = {
          ...this.original,
          ...payload,
          Rationale: cleanedRationales
        };
        this.isEditing = false;
        this.processing = false;

        Swal.fire({
          icon: 'success',
          title: 'تم الحفظ بنجاح',
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (err) => {
        console.error(err);
        this.processing = false;
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ أثناء الحفظ',
          showConfirmButton: false,
          timer: 1500
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

  // عرض نموذج التعديل (amendment)
  showAmendmentForm() {
    this.showAmendmentReason = true;
    this.amendmentReason = '';
  }

  // إلغاء التعديل
  cancelAmendment() {
    this.showAmendmentReason = false;
    this.amendmentReason = '';
  }

  // تأكيد التعديل (إرسال amendment)
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
      updateData.Rationale = this.form.value.rationale;
      updateData.title = this.form.value.title;
      updateData.descriptions = this.descriptionsArray.value
        .map((desc: string) => desc.trim())
        .filter((desc: string) => desc !== '');
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

    amendmentObservable.subscribe(
      (res: any) => {
        this.original.status = 'amendment';
        this.original.reasonForRejection = this.amendmentReason;

        if (this.isEditing) {
          this.original.Rationale = this.form.value.rationale;
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
      (err) => {
        console.error('خطأ في إرسال التعديل:', err);
        this.processing = false;
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ أثناء إرسال التعديل',
          showConfirmButton: false,
          timer: 1500
        });
      }
    );
  }

  // الرفض النهائي (بدون نص)
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
            '', // بدون سبب
            undefined
          );
        } else {
          rejectionObservable = this.letterService.updateStatusByUniversityPresident(
            this.original._id,
            'rejected',
            '', // بدون سبب
            undefined
          );
        }

        rejectionObservable.subscribe(
          (res: any) => {
            this.original.status = 'rejected';
            this.processing = false;

            Swal.fire({
              icon: 'success',
              title: 'تم رفض القرار',
              showConfirmButton: false,
              timer: 1500
            });
          },
          (err) => {
            console.error('خطأ في رفض القرار:', err);
            this.processing = false;
            Swal.fire({
              icon: 'error',
              title: 'حدث خطأ أثناء رفض القرار',
              showConfirmButton: false,
              timer: 1500
            });
          }
        );
      }
    });
  }

  approveLetter(option?: 'حقيقية' | 'الممسوحة ضوئيا') {
    if (!this.original?._id) return;

    this.processing = true;

    if (this.currentUserRole === 'supervisor') {
      this.letterService
        .updateStatusBySupervisor(this.original._id, 'pending')
        .subscribe({
          next: () => {
            this.original.status = 'pending';
            this.processing = false;
          },
          error: (err) => {
            console.error(err);
            this.processing = false;
          },
        });
    } else if (this.currentUserRole === 'UniversityPresident') {
      if (!option) {
        this.letterService
          .updateStatusByUniversityPresident(this.original._id, 'approved', 'حقيقية')
          .subscribe({
            next: () => {
              this.original.status = 'approved';
              this.processing = false;
              this.generateAndSavePdf();
            },
            error: (err) => {
              console.error(err);
              this.processing = false;
            },
          });
      } else {
        this.letterService
          .updateStatusByUniversityPresident(this.original._id, 'approved', option)
          .subscribe({
            next: () => {
              this.original.status = 'approved';
              this.letterService
                .printLetterByType(this.original._id, option)
                .subscribe({
                  next: (letter) => {
                    this.processing = false;
                    this.showPresidentOptions = false;

                    if (letter.pdfUrl) {
                      this.pdfUrl = letter.pdfUrl;
                      this.pdfFilename = this.extractFilenameFromUrl(letter.pdfUrl);
                      this.savePdfUrlToDatabase(letter.pdfUrl);
                    } else {
                      alert('لم يتم توليد ملف PDF بعد.');
                    }
                  },
                  error: (err) => {
                    console.error(err);
                    this.processing = false;
                    alert('حدث خطأ أثناء توليد PDF.');
                  },
                });
            },
            error: (err) => {
              console.error(err);
              this.processing = false;
            },
          });
      }
    }
  }

  private generateAndSavePdf() {
    this.letterService.generateOfficialLetterPDF(this.original._id).subscribe({
      next: (result) => {
        if (result.pdfUrl) {
          this.pdfUrl = result.pdfUrl;
          this.pdfFilename = this.extractFilenameFromUrl(result.pdfUrl);
          this.savePdfUrlToDatabase(result.pdfUrl);
          this.loadPdfByLetterId(this.original._id);
        }
      },
      error: (err) => {
        console.error('خطأ في إنشاء PDF تلقائي:', err);
      },
    });
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
    return this.original?.status === 'approved';
  }

  canShowPdf(): boolean {
    return this.showPdfButton() &&
      (this.pdfSearchAttempted || !!this.pdfUrl || !!this.pdfFilename);
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
    return this.original?.status === 'pending';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved': return 'badge bg-success';
      case 'pending': return 'badge bg-warning text-dark';
      case 'rejected': return 'badge bg-danger';
      case 'amendment': return 'badge bg-warning text-dark'; // جديد
      case 'in_progress': return 'badge bg-info text-dark';
      default: return 'badge bg-secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'تمت الموافقة';
      case 'pending': return 'قيد المراجعة لدى الرئيس';
      case 'rejected': return 'مرفوض';
      case 'amendment': return 'قيد التعديل'; // جديد
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
    return (
      (this.currentUserRole === 'supervisor' &&
        this.original?.status === 'in_progress') ||
      (this.currentUserRole === 'UniversityPresident' &&
        this.original?.status === 'pending')
    );
  }

  showRejectionDetails(): boolean {
    return (
      (this.original?.status === 'rejected' || this.original?.status === 'amendment') && 
      this.original?.reasonForRejection
    );
  }
}