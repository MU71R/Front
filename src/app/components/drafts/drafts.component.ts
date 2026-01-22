import { Component, OnInit } from '@angular/core';
import { LetterService, DraftLetter } from '../../service/letter.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-draft-letters',
  templateUrl: './drafts.component.html',
  styleUrls: ['./drafts.component.css']
})
export class DraftLettersComponent implements OnInit {
  draftLetters: DraftLetter[] = [];
  loading = true;
  selectedImage: string = '';
  showImageModal = false;

  constructor(
    private letterService: LetterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkAuth();
    this.loadDrafts();
  }

  checkAuth(): void {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: 'لم يتم العثور على توكن المصادقة. يرجى تسجيل الدخول.',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3085d6',
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }
  }

  // =============== دوال محتوى القرار ===============

  getLetterContent(letter: DraftLetter): string {
    const descriptions = letter.descriptions?.join(' ') || '';
    const rationale = letter.Rationale?.join(' ') || '';
    return descriptions + (descriptions && rationale ? ' ' : '') + rationale;
  }

  getAttachments(letter: DraftLetter): string[] {
    // تحقق من وجود Attachments أو attachments
    return (letter as any).Attachments || (letter as any).attachments || [];
  }

  // =============== دوال المساعدة ===============

  getCleanDescription(content: string): string {
    if (!content) return 'لا يوجد محتوى';

    if (content.includes('<') && content.includes('>')) {
      return this.stripHtmlTags(content);
    }

    return content.length > 300 ? content.substring(0, 300) + '...' : content;
  }

  private stripHtmlTags(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  getUserName(letter: DraftLetter): string {
  return (letter as any).fullName || 'غير محدد';
}


getEntityName(letter: DraftLetter): string {
  if ((letter as any).entityName) {
    return (letter as any).entityName;
  }

  return 'غير محدد';
}



  getMainCriteriaName(letter: DraftLetter): string {
    if (!letter.mainCriteria) return 'غير محدد';

    if (typeof letter.mainCriteria === 'object') {
      const criteria = letter.mainCriteria as any;
      return criteria.name || criteria.title || 'غير محدد';
    }

    return 'غير محدد';
  }

  getSubCriteriaName(letter: DraftLetter): string {
    if (!letter.subCriteria) return 'غير محدد';

    if (typeof letter.subCriteria === 'object') {
      const criteria = letter.subCriteria as any;
      return criteria.name || criteria.title || 'غير محدد';
    }

    return 'غير محدد';
  }

  getLetterTypeArabic(type: string | undefined): string {
    if (!type) return 'غير محدد';

    const types: {[key: string]: string} = {
      'رئاسة الوزراء': 'رئاسة الوزراء',
      'رئاسة الجمهورية': 'رئاسة الجمهورية',
      'وزارة التعليم العالي': 'وزارة التعليم العالي',
      'عامة': 'عامة',
      'اخرى': 'أخرى',
      'administrative': 'إداري',
      'academic': 'أكاديمي',
      'financial': 'مالي',
      'technical': 'فني',
      'other': 'أخرى'
    };

    return types[type] || type;
  }

  // =============== دوال المرفقات ===============

  isImage(attachment: string | undefined): boolean {
    if (!attachment) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(
      (ext) =>
        attachment.toLowerCase().endsWith(ext) ||
        attachment.toLowerCase().includes(ext)
    );
  }

  isPdf(attachment: string | undefined): boolean {
    if (!attachment) return false;
    return attachment.toLowerCase().includes('.pdf');
  }

  getFullAttachmentUrl(attachment: string | undefined): string {
    if (!attachment) return '';

    if (attachment.startsWith('http')) {
      return attachment;
    } else {
      const baseUrl = 'http://localhost:3000';
      return `${baseUrl}${attachment}`;
    }
  }

  openImageModal(attachment: string): void {
    this.selectedImage = this.getFullAttachmentUrl(attachment);
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedImage = '';
  }

  // =============== دوال التاريخ ===============

 formatDate(dateValue: string | Date | undefined | null): string {
  if (!dateValue) return 'غير محدد';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'غير محدد';
    }

    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'غير محدد';
  }
}


  formatStartDate(letter: DraftLetter): string {
    return this.formatDate(letter.StartDate);
  }

  formatEndDate(letter: DraftLetter): string {
    return this.formatDate(letter.EndDate);
  }

  formatCreatedDate(letter: DraftLetter): string {
    return this.formatDate(letter.createdAt);
  }

  formatUpdatedDate(letter: DraftLetter): string {
    return this.formatDate((letter as any).updatedAt);
  }

  // =============== دوال تحميل المسودات ===============

  loadDrafts(): void {
    this.loading = true;
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');

    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: 'يرجى تسجيل الدخول أولاً',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3085d6',
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    this.letterService.getDraftLetters().subscribe({
      next: (response) => {
        console.log('Loaded draft letters response:', response);
        this.draftLetters = response.data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading draft letters:', err);

        if (err.status === 401) {
          Swal.fire({
            icon: 'warning',
            title: 'انتهت الجلسة',
            text: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
            confirmButtonText: 'تسجيل الدخول',
            confirmButtonColor: '#3085d6',
          }).then(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            this.router.navigate(['/login']);
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ في تحميل المسودات: ' + err.message,
            confirmButtonText: 'حسناً',
            confirmButtonColor: '#d33',
          });
        }
        this.loading = false;
      },
    });
  }

  // =============== دوال الإجراءات ===============

  editDraft(letter: DraftLetter): void {
  console.log('Editing draft letter:', letter);

  // معالجة المسودة لاستخراج الجداول
  const processedDraft = this.prepareDraftForEditing(letter);

  // تسجيل البيانات المعالجة للتصحيح
  console.log('Processed draft for editing:', {
    originalDescriptionsCount: letter.descriptions?.length || 0,
    processedDescriptionsCount: processedDraft.descriptions?.length || 0,
    tablesCount: processedDraft.tables?.length || 0,
    tables: processedDraft.tables
  });

  // حفظ المسودة المعالجة بنفس المفتاح المتوقع
  localStorage.setItem('editingLetterDraft', JSON.stringify(processedDraft));

  // الانتقال لصفحة إنشاء / تعديل القرار
  this.router.navigate(['/declaration']);
}


// في ملف drafts.component.ts
// =============== دوال محتوى القرار ===============

getDescriptions(letter: DraftLetter): string[] {
  return letter.descriptions || [];
}

getRationales(letter: DraftLetter): string[] {
  return letter.Rationale || [];
}

getCleanItemContent(content: string): string {
  if (!content) return '';

  if (content.includes('<') && content.includes('>')) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  // عرض أول 150 حرف فقط
  return content.length > 150 ? content.substring(0, 150) + '...' : content;
}

hasContent(letter: DraftLetter): boolean {
  return (letter.descriptions && letter.descriptions.length > 0) ||
         (letter.Rationale && letter.Rationale.length > 0);
}

  deleteDraft(id: string): void {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من استعادة هذه المسودة بعد الحذف!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذفها',
      cancelButtonText: 'إلغاء',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.letterService.deleteDraftLetter(id).subscribe({
          next: (response) => {
            if (response?.success) {
              this.loadDrafts();
              Swal.fire({
                title: 'تم الحذف!',
                text: response.message || 'تم حذف المسودة بنجاح.',
                icon: 'success',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'حسناً',
              });
            } else {
              Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: response?.message || 'فشل في حذف المسودة',
                confirmButtonText: 'حسناً',
                confirmButtonColor: '#d33',
              });
            }
          },
          error: (err) => {
            console.error('Error deleting draft:', err);
            Swal.fire({
              icon: 'error',
              title: 'خطأ',
              text: 'فشل في حذف المسودة: ' + err.message,
              confirmButtonText: 'حسناً',
              confirmButtonColor: '#d33',
            });
          },
        });
      }
    });
  }

  publishDraft(id: string): void {
    Swal.fire({
      title: 'ارسال المسودة',
      text: 'هل تريد ارسال القرار  للمراجعه',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، ارسال',
      cancelButtonText: 'إلغاء',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // أولاً: جلب المسودة الحالية
        this.letterService.getDraftLetterById(id).subscribe({
          next: (draftResponse) => {
            const draft = draftResponse.data;

            // تحويلها إلى قرار كامل
            const publishPayload = {
              ...draft,
              SaveStatus: 'مكتمل',
              status: 'pending'
            };

            // استخدام updateLetter لتحويلها إلى قرار كامل
            this.letterService.updateLetter(id, publishPayload as any).subscribe({
              next: (response) => {
                this.loadDrafts();
                Swal.fire({
                  title: 'تم النشر!',
                  text: 'تم تحويل المسودة إلى قرار رسمي بنجاح.',
                  icon: 'success',
                  confirmButtonColor: '#3085d6',
                  confirmButtonText: 'حسناً',
                });
              },
              error: (err) => {
                console.error('Error publishing draft:', err);
                Swal.fire({
                  icon: 'error',
                  title: 'خطأ',
                  text: 'فشل في نشر المسودة: ' + err.message,
                  confirmButtonText: 'حسناً',
                  confirmButtonColor: '#d33',
                });
              }
            });
          },
          error: (err) => {
            console.error('Error fetching draft:', err);
            Swal.fire({
              icon: 'error',
              title: 'خطأ',
              text: 'فشل في جلب بيانات المسودة: ' + err.message,
              confirmButtonText: 'حسناً',
              confirmButtonColor: '#d33',
            });
          }
        });
      }
    });
  }

  duplicateDraft(id: string): void {
    Swal.fire({
      title: 'نسخ المسودة',
      text: 'هل تريد نسخ هذه المسودة؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، انسخ',
      cancelButtonText: 'إلغاء',
    }).then((result) => {
      if (result.isConfirmed) {
        this.letterService.duplicateDraft(id).subscribe({
          next: (response) => {
            if (response?.success) {
              this.loadDrafts();
              Swal.fire({
                title: 'تم النسخ!',
                text: response.message || 'تم نسخ المسودة بنجاح.',
                icon: 'success',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'حسناً',
              });
            }
          },
          error: (err) => {
            console.error('Error duplicating draft:', err);
            Swal.fire({
              icon: 'error',
              title: 'خطأ',
              text: 'فشل في نسخ المسودة: ' + err.message,
              confirmButtonText: 'حسناً',
              confirmButtonColor: '#d33',
            });
          }
        });
      }
    });
  }

  canPublish(letter: DraftLetter): boolean {
    return letter.SaveStatus === 'مسودة';
  }

  // =============== دوال المساعدة ===============

  getSaveStatusArabic(saveStatus: string): string {
    return this.letterService.getSaveStatusArabic(saveStatus);
  }

  getStatusArabic(status: string | undefined): string {
    return status ? this.letterService.getStatusArabic(status) : 'غير محدد';
  }

  getSignatureTypeArabic(signatureType: string | undefined): string {
    return signatureType ? this.letterService.getSignatureTypeArabic(signatureType) : 'غير محدد';
  }

  // =============== دوال عرض البيانات ===============

  getTransactionNumber(letter: DraftLetter): string {
    return letter.transactionNumber ? letter.transactionNumber.toString() : 'غير معين';
  }

  // دالة للتحقق من وجود رابط PDF
  hasPdfUrl(letter: DraftLetter): boolean {
    return !!(letter as any).pdfUrl;
  }

  // دالة للحصول على رابط PDF
  getPdfUrl(letter: DraftLetter): string {
    return (letter as any).pdfUrl || '';
  }

  // تحويل التاريخ إلى تنسيق YYYY-MM-DD للإدخال
  formatDateForInput(dateValue: string | Date | undefined | null): string {
    if (!dateValue) return '';

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return '';
      }

      return date.toISOString().split('T')[0];
    } catch (error) {
      return '';
    }
  }

// في drafts.component.ts
// =============== دوال تحويل الجداول ===============

// دالة لاستخراج بيانات الجدول من HTML
extractTableDataFromHtml(html: string): any {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    if (!table) {
      return null;
    }

    const rows = table.querySelectorAll('tr');
    const data: string[][] = [];

    rows.forEach(row => {
      const rowData: string[] = [];
      const cells = row.querySelectorAll('td, th');
      cells.forEach(cell => {
        const cellText = cell.textContent?.trim() || '';
        rowData.push(cellText);
      });
      if (rowData.length > 0) {
        data.push(rowData);
      }
    });

    return {
      rows: data.length,
      cols: data[0]?.length || 0,
      data: data
    };
  } catch (error) {
    console.error('Error extracting table from HTML:', error);
    return null;
  }
}

// دالة للتحقق إذا كان المحتوى جدول
isTableContent(content: string): boolean {
  if (!content) return false;
  return content.includes('<table') ||
         content.includes('<tbody>') ||
         content.includes('<tr>') ||
         content.includes('class="table"') ||
         content.includes('decision-table') ||
         content.includes('table-responsive');
}

// دالة لمعالجة المسودة قبل الحفظ
prepareDraftForEditing(letter: DraftLetter): any {
  const processedLetter = JSON.parse(JSON.stringify(letter));
  const tablesData: any[] = [];
  const processedDescriptions: string[] = [];

  // تحليل البنود لاستخراج الجداول
  if (processedLetter.descriptions && Array.isArray(processedLetter.descriptions)) {
    processedLetter.descriptions.forEach((description: string, index: number) => {
      if (this.isTableContent(description)) {
        // هذا جدول، استخراج بياناته
        const tableData = this.extractTableDataFromHtml(description);
        if (tableData) {
          tablesData.push({
            ...tableData,
            descriptionIndex: index,
            isTable: true
          });
        }
        processedDescriptions.push(description);
      } else {
        // هذا بند نصي عادي
        processedDescriptions.push(description);
      }
    });

    processedLetter.descriptions = processedDescriptions;
  }

  // إذا كانت هناك جداول مخزنة بشكل منفصل
  if (processedLetter.tables && Array.isArray(processedLetter.tables)) {
    // دمج الجداول من الـ tables array
    processedLetter.tables.forEach((table: any, index: number) => {
      tablesData.push({
        ...table,
        descriptionIndex: processedDescriptions.length + index,
        isTable: true
      });
    });
  }

  // حفظ بيانات الجداول في خاصية tables
  processedLetter.tables = tablesData;

  return processedLetter;
}

// دالة للتعرف على نوع المحتوى
getItemType(content: string): string {
  if (this.isTableContent(content)) {
    return 'جدول';
  } else if (content.length > 100) {
    return 'نص طويل';
  } else {
    return 'نص';
  }
}

getFullItemContent(content: string): string {
  if (!content) return '';
  return content;
}

}
