import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';
import { LetterService } from 'src/app/service/letter.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-letter-details',
  templateUrl: './archived-letter-details.component.html',
  styleUrls: ['./archived-letter-details.component.css'],
})
export class LetterDetailsComponent implements OnInit {
  letterId: string = '';
  letter: any = null;
  loading = true;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfFilename: string | null = null;
  pdfFile: any = null;
  showUploadModal = false; // تم التعديل هنا من true إلى false
  selectedFile: File | null = null;
  private sectorsMap: Map<string, string> = new Map();
  private usersMap: Map<string, any> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private archiveService: ArchiveService,
    private letterService: LetterService,
    private authService: AuthService
  ) {}
  user = this.authService.currentUserValue;
  ngOnInit(): void {
    this.letterId = this.route.snapshot.paramMap.get('id') || '';
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
        icon: 'error',
        title: 'خطأ',
        text: 'لا يوجد ملف PDF متاح للتنزيل',
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
        icon: 'error',
        title: 'خطأ',
        text: 'لا يوجد ملف PDF متاح للتنزيل',
      });
    }
  }

  showPdfButton(): boolean {
    return (
      this.letter?.status === 'approved' &&
      (!!this.pdfUrl || !!this.pdfFilename)
    );
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      approved: 'معتمد',
      pending: 'قيد المراجعة',
      rejected: 'مرفوض',
      draft: 'مسودة',
      reviewed: 'تمت المراجعة',
      archived: 'مؤرشف',
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
    };
    return roleMap[role] || role;
  }

  getSectorName(sectorId: string): string {
    const sectorMap: { [key: string]: string } = {
      '68ff54614859681125c5455f': 'الإدارة العامة للشئون القانونية',
      '68ff54844859681125c54563': 'إدارة الوحدات ذات الطابع الخاص',
    };
    return sectorMap[sectorId] || sectorId;
  }

  getSupervisorName(supervisorId: string): string {
    const supervisorMap: { [key: string]: string } = {
      '68ff62b4936b0f8ca0412182': 'الإدارة العامة للشئون القانونية',
      '68ffaf5984b59cbf1298c3d2': 'إدارة الوحدات ذات الطابع الخاص',
    };
    return supervisorMap[supervisorId] || supervisorId;
  }

  getUserName(userId: string): string {
    const userMap: { [key: string]: string } = {
      '690dccb25b4f51cf531fd3b9': 'د/كتور احمد',
      '68ffaf5984b59cbf1298c3d2': 'إدارة الوحدات ذات الطابع الخاص',
      '68ff62b4936b0f8ca0412182': 'الإدارة العامة للشئون القانونية',
    };
    return userMap[userId] || userId;
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

  getAttachmentUrl(fileName: string): string {
    if (!fileName) return '';

    const cleanPath = fileName.replace(/^.*[\\\/]/, '');
    const baseUrl = 'http://localhost:3000/uploads';
    return `${baseUrl}/${encodeURIComponent(cleanPath)}`;
  }

  getDownloadUrl(fileName: string): string {
    if (!fileName) return '';
    const cleanPath = fileName.replace(/^.*[\\\/]/, '');
    return `http://localhost:3000/letters/download/${encodeURIComponent(
      cleanPath
    )}`;
  }

  formatDescription(description: string): string {
    if (!description) return '';
    return description
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/data-start="[^"]*"/g, '')
      .replace(/data-end="[^"]*"/g, '')
      .replace(/\\n/g, '<br>');
  }

  calculateDuration(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} يوم`;
  }

  hasMultipleSections(): boolean {
    let count = 1;
    if (this.letter?.description || this.letter?.breeif) count++;
    if (this.letter?.Rationale) count++;
    if (this.letter?.decision) count++;
    if (this.letter?.approvals && this.letter.approvals.length > 0) count++;
    if (this.letter?.attachment) count++;
    if (this.letter?.StartDate || this.letter?.EndDate) count++;

    return count > 2;
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
    this.selectedFile = null; // إعادة تعيين الملف المختار عند الإغلاق
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
}
