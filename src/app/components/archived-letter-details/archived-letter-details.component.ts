import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';
import { LetterService } from 'src/app/service/letter.service';
import { AdministrationService } from 'src/app/service/user.service';
import Swal from 'sweetalert2';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-letter-details',
  templateUrl: './archived-letter-details.component.html',
  styleUrls: ['./archived-letter-details.component.css'],
})
export class LetterDetailsComponent implements OnInit {
  letterId: string = '';
  letter: any = null;
  data: any = null;
  loading = true;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfFilename: string | null = null;
  pdfFile: any = null;
  showUploadModal = false;
  selectedFile: File | null = null;
  private sectorsMap: Map<string, string> = new Map();
  private usersMap: Map<string, any> = new Map();
  sectors: any[] = [];
  showCancelModal = false;
  isOpening = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private archiveService: ArchiveService,
    private letterService: LetterService,
    private authService: AuthService,
    private userService: AdministrationService,
    private sanitizer: DomSanitizer
  ) { }

  user = this.authService.currentUserValue;

  // دالة التحقق من إمكانية رفع الملفات
  canUpload(): boolean {
    if (!this.user || !this.letter) return false;

    return (
      this.user.role?.toLowerCase() === 'universitypresident' ||
      this.user.fullname?.includes('رئيس الجامعة')
    );
  }

  ngOnInit(): void {
    this.letterId = this.route.snapshot.paramMap.get('id') || '';
    this.getAllSectors();
    if (this.letterId) {
      this.getLetterDetails();
    } else {
      this.loading = false;
    }
  }

  getLetterDetails() {
    this.loading = true;
    this.archiveService.getLetterById(this.letterId).subscribe({
      next: (res: any) => {
        this.letter = res?.data || null;

        if (this.letter) {
          this.loadPdfByLetterId(this.letterId);
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('خطأ أثناء جلب تفاصيل القرار:', err);
        this.loading = false;
      },
    });
  }

  private loadPdfByLetterId(letterId: string) {
    this.pdfLoading = true;

    this.letterService.getPDFbyLetterId(letterId).subscribe({
      next: (response) => {
        this.pdfLoading = false;
        if (response.success && response.pdfFile) {
          this.pdfFile = response.pdfFile;
          this.pdfUrl = response.pdfFile.pdfurl;
          this.pdfFilename = this.extractFilenameFromUrl(
            response.pdfFile.pdfurl
          );
        }
      },
      error: (err) => {
        this.pdfLoading = false;
        console.error('خطأ في جلب PDF:', err);
      },
    });
  }

  private extractFilenameFromUrl(url: string): string {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  private generateDownloadName(): string {
    const title = this.letter?.title
      ? this.letter.title.replace(/[^\w\u0600-\u06FF]/g, '_')
      : 'قرار';
    const date = this.letter?.date
      ? new Date(this.letter.date).toISOString().split('T')[0]
      : '';
    return `قرار_${title}_${date}.pdf`;
  }

  get timeline() {
    return this.letter || this.data;
  }

  getAllSectors() {
    this.userService.getAllSectors().subscribe({
      next: (res: any) => {
        this.sectors = res?.data || [];
      },
      error: (err) => {
        console.error('Error fetching sectors:', err);
      }
    });
  }

  openPdf(): void {
    if (!this.pdfFilename) {
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف PDF متاح للعرض',
        showConfirmButton: true
      });
      return;
    }

    const apiUrl = `http://localhost:3000/api/letters/view-pdf-online/${encodeURIComponent(this.pdfFilename)}`;

    this.letterService.getPDF(apiUrl).subscribe({
      next: (blob: Blob) => {
        // إنشاء رابط مؤقت لعرض الملف
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank'); // يفتح PDF في تاب جديد
        // URL.revokeObjectURL(url); // ممكن تستدعي بعد فترة قصيرة للتنظيف
      },
      error: (err) => {
        console.error("خطأ في جلب الملف:", err);
        Swal.fire({
          icon: 'warning',
          title: 'لا يمكن عرض الملف حالياً',
          showConfirmButton: true
        });
      }
    });
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
        icon: 'error',
        title: 'خطأ',
        text: 'لا يوجد ملف PDF متاح للتنزيل',
      });
    }
  }

  showPdfButton(): boolean {
    return this.letter?.status === 'approved' && (!!this.pdfUrl || !!this.pdfFilename);
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      approved: 'معتمد',
      pending: 'قيد المراجعة',
      rejected: 'مرفوض',
      draft: 'مسودة',
      reviewed: 'تمت المراجعة',
      archived: 'مؤرشف',
      canceled: 'ملغي',
    };
    return statusMap[status] || 'غير محدد';
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      approved: 'status-approved',
      pending: 'status-pending',
      rejected: 'status-rejected',
      draft: 'status-draft',
      reviewed: 'status-reviewed',
      archived: 'status-archived',
      canceled: 'status-canceled',
    };
    return classMap[status] || 'status-pending';
  }

  getTypeBadgeClass(type: string): string {
    const badgeMap: { [key: string]: string } = {
      'رئاسة الجمهورية': 'badge-presidential',
      'وزارة التعليم العالي': 'badge-ministerial',
      'رئاسة الوزراء': 'badge-governmental',
      'اخرى': 'badge-another',
      عامة: 'badge-general',
      شخصي: 'badge-personal',
      مراجع: 'badge-review',
      رسمي: 'badge-official',
      داخلي: 'badge-internal',
    };
    return badgeMap[type] || 'badge-general';
  }

  getTypeIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'رئاسة الجمهورية': 'fa-flag',
      'وزارة التعليم العالي': 'fa-graduation-cap',
      'رئاسة الوزراء': 'fa-landmark',
      'اخرى': 'fa-file',
      عامة: 'fa-file',
      شخصي: 'fa-user',
      مراجع: 'fa-eye',
      رسمي: 'fa-stamp',
      داخلي: 'fa-building',
    };
    return iconMap[type] || 'fa-file';
  }

  getPriorityText(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      high: 'عاجل',
      medium: 'متوسط',
      low: 'عادي',
    };
    return priorityMap[priority] || 'عادي';
  }

  getPriorityClass(priority: string): string {
    const classMap: { [key: string]: string } = {
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return classMap[priority] || 'priority-low';
  }

  getPriorityIcon(priority: string): string {
    const iconMap: { [key: string]: string } = {
      high: 'fa-exclamation-circle',
      medium: 'fa-arrow-up',
      low: 'fa-arrow-down',
    };
    return iconMap[priority] || 'fa-minus';
  }

  getRoleText(role: string): string {
    const roleMap: { [key: string]: string } = {
      supervisor: 'مراجع',
      UniversityPresident: 'رئيس الجامعة',
      admin: 'مدير نظام',
      user: 'مستخدم',
      manager: 'مدير',
      director: 'مدير عام',
      preparer: 'معد القرار',
    };
    return roleMap[role] || role;
  }

  getSectorName(sectorId: string, sectors: { _id: string, sector: string }[]): string {
    const found = sectors.find(s => s._id === sectorId);
    return found ? found.sector : 'غير معروف';
  }

  getSupervisorName(supervisorId: string): string {
    return supervisorId;
  }

  getUserName(userId: string): string {
    return userId;
  }

  getFileName(filePath: string): string {
    if (!filePath) return 'ملف مرفق';
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1] || 'ملف مرفق';
  }

  getFileIcon(filePath: string): string {
    const extension = filePath?.split('.').pop()?.toLowerCase() || '';
    const iconMap: { [key: string]: string } = {
      pdf: 'fa-file-pdf text-danger',
      doc: 'fa-file-word text-primary',
      docx: 'fa-file-word text-primary',
      xls: 'fa-file-excel text-success',
      xlsx: 'fa-file-excel text-success',
      ppt: 'fa-file-powerpoint text-warning',
      pptx: 'fa-file-powerpoint text-warning',
      jpg: 'fa-file-image text-info',
      jpeg: 'fa-file-image text-info',
      png: 'fa-file-image text-info',
      zip: 'fa-file-archive text-secondary',
      rar: 'fa-file-archive text-secondary',
    };
    return iconMap[extension] || 'fa-file text-muted';
  }

  getFileSize(filePath: string): string {
    return '';
  }

  openAttachment(fileName: string): void {
    if (this.isOpening) return;
    this.isOpening = true;

    const apiUrl = `http://www.svu.edu.eg:8080/api/letters/view-pdf-online-uploaded/${encodeURIComponent(fileName)}`;

    this.letterService.getPDF(apiUrl).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.isOpening = false;
      },
      error: () => {
        this.isOpening = false;
      }
    });
  }



  downloadAttachment(fileName: string): void {
    if (!fileName) {
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف للتحميل',
        showConfirmButton: true
      });
      return;
    }

    const cleanName = fileName.replace(/^.*[\\/]/, '');

    const apiUrl =
      `http://www.svu.edu.eg:8080/api/letters/download-uploaded/${encodeURIComponent(cleanName)}`;

    this.letterService.getPDF(apiUrl).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = cleanName;
        a.click();

        window.URL.revokeObjectURL(url);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'فشل تحميل الملف'
        });
      }
    });
  }

  // دالة للتحقق مما إذا كان النص يحتوي على جدول
  isTableDescription(description: string): boolean {
    if (!description) return false;
    return description.includes('<table') && description.includes('</table>');
  }

  // دالة لاستخراج الجدول من النص
  getTableFromDescription(description: string): string {
    if (!this.isTableDescription(description)) return description;

    // استخراج الجدول من النص
    const tableRegex = /(<table[^>]*>[\s\S]*?<\/table>)/i;
    const match = description.match(tableRegex);

    if (match && match[1]) {
      // إضافة تنسيقات CSS للجدول
      return `
        <div class="table-responsive">
          <style>
            .decision-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              direction: rtl;
              font-family: Arial, sans-serif;
            }
            .decision-table th {
              background-color: #f8f9fa;
              font-weight: bold;
              text-align: right;
              padding: 12px;
              border: 1px solid #dee2e6;
            }
            .decision-table td {
              text-align: right;
              padding: 10px;
              border: 1px solid #dee2e6;
              vertical-align: middle;
            }
            .decision-table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            .decision-table tr:hover {
              background-color: #e9ecef;
            }
          </style>
          ${match[1]}
        </div>
      `;
    }

    return description;
  }

  // دالة لمعالجة النصوص (مع دعم الجداول)
  formatDescription(description: string): string {
    if (!description) return '';

    // إذا كان النص يحتوي على جدول
    if (this.isTableDescription(description)) {
      return this.getTableFromDescription(description);
    }

    // إذا كان نص عادي
    return description
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/data-start="[^"]*"/g, '')
      .replace(/data-end="[^"]*"/g, '')
      .replace(/\\n/g, '<br>')
      // إضافة تنسيقات للعناوين والقوائم
      .replace(/<p><strong>(.*?)<\/strong><\/p>/g, '<h4 class="description-subtitle">$1</h4>')
      .replace(/<ul>/g, '<ul class="description-list">')
      .replace(/<ol>/g, '<ol class="description-list">');
  }

  calculateDuration(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return 'غير محدد';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} يوم`;
  }

  hasMultipleSections(): boolean {
    let count = 1;
    if (this.letter?.description || this.letter?.breeif) count++;
    if (this.letter?.Rationale && this.letter?.Rationale.length > 0) count++;
    if (this.letter?.decision) count++;
    if (this.letter?.approvals && this.letter.approvals.length > 0) count++;
    if (this.letter?.attachment) count++;
    if (this.letter?.StartDate || this.letter?.EndDate) count++;

    return count > 2;
  }

  getArabicOrdinal(index: number): string {
    const ordinals = [
      'أولاً', 'ثانياً', 'ثالثاً', 'رابعاً', 'خامساً',
      'سادساً', 'سابعاً', 'ثامناً', 'تاسعاً', 'عاشراً',
      'حادي عشر', 'ثاني عشر', 'ثالث عشر', 'رابع عشر', 'خامس عشر',
      'سادس عشر', 'سابع عشر', 'ثامن عشر', 'تاسع عشر', 'عشرون',
      'حادي عشرون', 'ثاني عشرون', 'ثالث عشرون', 'رابع عشرون', 'خامس عشرون',
      'سادس عشرون', 'سابع عشرون', 'ثامن عشرون', 'تاسع عشرون', 'ثلاثون'
    ];
    return ordinals[index] || `${index + 1}`;
  }

  goBack() {
    this.router.navigate(['/archive-detail'], {
      queryParams: { type: localStorage.getItem('archiveType') || '' },
    });
  }

  openUploadModal() {
    this.showUploadModal = true;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.selectedFile = null;
  }

  selectNewFile(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadNewFile() {
    if (!this.selectedFile) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'يرجى اختيار ملف أولاً',
      });
      return;
    }

    const formData = new FormData();
    formData.append('pdf', this.selectedFile);

    this.archiveService
      .updateLetterAttachment(this.letter.id, formData)
      .subscribe({
        next: (res) => {
          this.letter.attachment = res.attachment;
          this.selectedFile = null;
          this.closeUploadModal();
          Swal.fire({
            icon: 'success',
            title: 'تم رفع الملف الجديد بنجاح',
          });
        },
        error: (err) => {
          console.error('خطأ في رفع الملف:', err);
          Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ أثناء رفع الملف',
          });
        },
      });
  }

  // وظيفة فتح نافذة التأكيد لإلغاء القرار
  openCancelModal() {
    this.showCancelModal = true;
  }

  // وظيفة إغلاق نافذة التأكيد
  closeCancelModal() {
    this.showCancelModal = false;
  }

  // وظيفة إلغاء القرار
  cancelDecision() {
    Swal.fire({
      title: 'تأكيد الإلغاء',
      html: '<p style="font-size: 16px; color: #d33;">يرجى العلم أنه سيتم إيقاف العمل بهذا القرار</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، إلغاء القرار',
      cancelButtonText: 'تراجع',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        // استدعاء الـ API لتغيير حالة القرار إلى canceled
        this.letterService.cancelLetter(this.letter.id || this.letter._id).subscribe({
          next: (res) => {
            this.letter.status = 'canceled';
            this.closeCancelModal();
            Swal.fire({
              icon: 'success',
              title: 'تم إلغاء القرار',
              text: 'تم إوقف العمل بالقرار بنجاح',
              confirmButtonText: 'حسناً'
            });
          },
          error: (err) => {
            console.error('خطأ في إلغاء القرار:', err);
            Swal.fire({
              icon: 'error',
              title: 'خطأ',
              text: 'حدث خطأ أثناء إلغاء القرار',
              confirmButtonText: 'حسناً'
            });
          },
        });
      }
    });
  }

  canViewNationalId(): boolean {
    // رئيس الجامعة يمكنه رؤية كل شيء
    // لو مش عامل login
    if (!this.user || !this.user._id) {
      return false;
    }

    // رئيس الجامعة ومناصب معينة
    if (
      this.user.role === 'UniversityPresident' ||
      this.user.fullname === 'مكتب رئيس الجامعة' ||
      this.user.fullname === 'نائب رئيس الجامعة لشئون التعليم والطلاب' ||
      this.user.fullname === 'نائب رئيس الجامعة لشئون الدراسات العليا والبحوث' ||
      this.user.fullname === 'نائب رئيس الجامعة لشئون البيئة وخدمة المجتمع' ||
      this.user.fullname === 'أمين عام الجامعة' ||
      this.user.fullname === 'أمين عام الجامعة المساعد' ||
      this.user.fullname === 'أمين عام الجامعة المساعد2'
    ) {
      return true;
    }

    // صاحب القرار فقط
    if (
      this.letter?.user?._id === this.user._id ||
      this.letter?.user?.id === this.user._id
    ) {
      return true;
    }

    //  غير ذلك
    return false;
  }

  // التحقق من إمكانية إظهار زر الإلغاء
  canCancelDecision(): boolean {
    if (!this.user) return false;

    return (
      this.letter?.status === 'approved' &&
      (this.user.role === 'UniversityPresident')
    );
  }
}