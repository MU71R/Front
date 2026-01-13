import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';
import { LetterService } from 'src/app/service/letter.service';
import Swal from 'sweetalert2';
import { DomSanitizer } from '@angular/platform-browser';

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
  isOpening = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private archiveService: ArchiveService,
    private letterService: LetterService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
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
    if (!this.pdfFilename) {
      Swal.fire({
        icon: 'warning',
        title: 'لا يوجد ملف PDF متاح للعرض',
        showConfirmButton: true
      });
      return;
    }

    const apiUrl = `http://www.svu.edu.eg:8080/api/letters/view-pdf-online/${encodeURIComponent(this.pdfFilename)}`;

    this.letterService.getPDF(apiUrl).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
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

  /**
   * إظهار زر PDF
   */
  showPdfButton(): boolean {
    return !!(this.pdfUrl || this.pdfFilename);
  }

  /**
   * التحقق من إمكانية عرض الرقم الوطني
   * يمكن عرضه فقط لرئيس الجامعة أو معد القرار
   */
  canViewNationalId(): boolean {
    if (!this.user || !this.user._id) {
      return false;
    }

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
    
    if (
      this.letter?.user?._id === this.user._id || 
      this.letter?.user?.id === this.user._id
    ) {
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

  /**
   * دالة للتحقق مما إذا كان النص يحتوي على جدول
   */
  isTableDescription(description: string): boolean {
    if (!description) return false;
    return description.includes('<table') && description.includes('</table>');
  }

  /**
   * دالة لاستخراج الجدول من النص
   */
  getTableFromDescription(description: string): string {
    if (!this.isTableDescription(description)) return description;
    
    const tableRegex = /(<table[^>]*>[\s\S]*?<\/table>)/i;
    const match = description.match(tableRegex);
    
    if (match && match[1]) {
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

  /**
   * دالة لمعالجة النصوص (مع دعم الجداول)
   */
  formatDescription(description: string): string {
    if (!description) return '';
    
    if (this.isTableDescription(description)) {
      return this.getTableFromDescription(description);
    }
    
    return description
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/data-start="[^"]*"/g, '')
      .replace(/data-end="[^"]*"/g, '')
      .replace(/\\n/g, '<br>')
      .replace(/<p><strong>(.*?)<\/strong><\/p>/g, '<h4 class="description-subtitle">$1</h4>')
      .replace(/<ul>/g, '<ul class="description-list">')
      .replace(/<ol>/g, '<ol class="description-list">');
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