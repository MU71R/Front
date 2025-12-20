import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';
import { LetterService } from 'src/app/service/letter.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-canceled-letter-details',
  templateUrl: './canceled-letter-details.component.html',
  styleUrls: ['./canceled-letter-details.component.css'],
})
export class CanceledLetterDetailsComponent implements OnInit {
  letterId: string = '';
  letter: any = null;
  loading = true;
  pdfLoading = false;
  pdfUrl: string | null = null;
  pdfFilename: string | null = null;
  pdfFile: any = null;

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

  /**
   * الحصول على تفاصيل القرار
   */
  getLetterDetails() {
    this.loading = true;
    this.letterService.getCancelledLetterById(this.letterId).subscribe({
      next: (res: any) => {
        this.letter = res?.data || null;

        // التحقق من أن القرار ملغي فعلاً
        if (this.letter && this.letter.status !== 'canceled') {
          Swal.fire({
            icon: 'warning',
            title: 'تحذير',
            text: 'هذا القرار ليس ملغياً',
            confirmButtonText: 'حسناً'
          }).then(() => {
            this.router.navigate(['/archive-detail']);
          });
        }

        if (this.letter) {
          this.loadPdfByLetterId(this.letterId);
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('خطأ أثناء جلب تفاصيل القرار:', err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: 'حدث خطأ أثناء تحميل تفاصيل القرار',
        });
      },
    });
  }

  /**
   * تحميل ملف PDF
   */
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

  /**
   * فتح ملف PDF
   */
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
        text: 'لا يوجد ملف PDF متاح',
      });
    }
  }

  /**
   * إظهار زر PDF
   */
  showPdfButton(): boolean {
    return !!(this.pdfUrl || this.pdfFilename);
  }

  /**
   * استرجاع القرار الملغي
   */
  // restoreDecision() {
  //   Swal.fire({
  //     title: 'تأكيد الاسترجاع',
  //     html: '<p style="font-size: 16px;">هل تريد استرجاع هذا القرار وإعادة تفعيله؟</p>',
  //     icon: 'question',
  //     showCancelButton: true,
  //     confirmButtonColor: '#28a745',
  //     cancelButtonColor: '#6c757d',
  //     confirmButtonText: 'نعم، استرجاع القرار',
  //     cancelButtonText: 'تراجع',
  //     reverseButtons: true
  //   }).then((result) => {
  //     if (result.isConfirmed) {
  //       this.archiveService.restoreLetter(this.letter.id || this.letter._id).subscribe({
  //         next: (res) => {
  //           Swal.fire({
  //             icon: 'success',
  //             title: 'تم الاسترجاع',
  //             text: 'تم استرجاع القرار بنجاح',
  //             confirmButtonText: 'حسناً'
  //           }).then(() => {
  //             this.router.navigate(['/canceled-letters']);
  //           });
  //         },
  //         error: (err) => {
  //           console.error('خطأ في استرجاع القرار:', err);
  //           Swal.fire({
  //             icon: 'error',
  //             title: 'خطأ',
  //             text: 'حدث خطأ أثناء استرجاع القرار',
  //             confirmButtonText: 'حسناً'
  //           });
  //         },
  //       });
  //     }
  //   });
  // }

  /**
   * التحقق من إمكانية استرجاع القرار
   */
  canRestoreDecision(): boolean {
    return (
      this.user?.role === 'UniversityPresident' || 
      this.user?.fullname === 'مكتب رئيس الجامعة'
    );
  }

  /**
   * التحقق من إمكانية عرض الرقم الوطني
   * يمكن عرضه فقط لرئيس الجامعة أو معد القرار
   */
  canViewNationalId(): boolean {
    // رئيس الجامعة يمكنه رؤية كل شيء
    if (this.user?.role === 'UniversityPresident' || 
        this.user?.fullname === 'مكتب رئيس الجامعة' ||
        this.user?.fullname === 'نائب رئيس الجامعة لشئون التعليم والطلاب' ||
        this.user?.fullname === 'نائب رئيس الجامعة لشئون الدراسات العليا والبحوث' ||
        this.user?.fullname === 'نائب رئيس الجامعة لشئون البيئة وخدمة المجتمع' ||
        this.user?.fullname === 'أمين عام الجامعة' ||
        this.user?.fullname === 'أمين عام الجامعة المساعد' ||
        this.user?.fullname === 'أمين عام الجامعة المساعد2') {
      return true;
    }
    
    // معد القرار يمكنه رؤية الرقم الوطني لقراره فقط
    if (this.letter?.user?._id === this.user?._id || 
        this.letter?.user?.id === this.user?._id) {
      return true;
    }
    
    return false;
  }

  /**
   * الحصول على اسم الشخص الذي ألغى القرار
   */
  getCanceledByName(canceledBy: any): string {
    if (typeof canceledBy === 'string') {
      return canceledBy;
    }
    return canceledBy?.fullname || 'غير محدد';
  }

  /**
   * العودة إلى قائمة القرارات الملغاة
   */
  goBack() {
    this.router.navigate(['/canceled-letters']);
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
}