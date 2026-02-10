import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';
import { LetterService } from 'src/app/service/letter.service';
import { AdministrationService } from 'src/app/service/user.service';
import Swal from 'sweetalert2';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  editMode = false;
  originalLetter: any;
  saving = false;

  // بيانات التعديل
  editData: any = {};

  // متغيرات للجدول
  showTableModal = false;
  tableRows = 3;
  tableCols = 3;
  currentTableData: any[][] = [];
  editingTableIndex: number | null = null;
  showAttachmentInput = false;

  // متغير لتخزين الملف المحدد
  newAttachmentFile: File | null = null;
  quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    ['clean']
  ]
};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private archiveService: ArchiveService,
    private letterService: LetterService,
    private authService: AuthService,
    private userService: AdministrationService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) { }

  user = this.authService.currentUserValue;

  ngOnInit(): void {
    this.letterId = this.route.snapshot.paramMap.get('id') || '';
    this.getAllSectors();
    if (this.letterId) {
      this.getLetterDetails();
    } else {
      this.loading = false;
    }
  }

  // === الدوال الأساسية ===

  getLetterDetails() {
    this.loading = true;
    this.archiveService.getLetterById(this.letterId).subscribe({
      next: (res: any) => {
        this.letter = res?.data || null;

        if (this.letter) {
          this.cleanLetterData();
          this.loadPdfByLetterId(this.letterId);
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('خطأ أثناء جلب تفاصيل القرار:', err);
        this.loading = false;
      },
    });
  }

  // تنظيف بيانات القرار
  private cleanLetterData() {
    if (!this.letter) return;

    // تنظيف Rationale
    this.letter.Rationale = this.parseToArray(this.letter.Rationale);

    // تنظيف descriptions
    this.letter.descriptions = this.parseToArray(this.letter.descriptions);

    // تنظيف التواريخ
    if (this.letter.StartDate) {
      const date = new Date(this.letter.StartDate);
      this.letter.StartDate = date.toISOString().split('T')[0];
    }

    if (this.letter.EndDate) {
      const date = new Date(this.letter.EndDate);
      this.letter.EndDate = date.toISOString().split('T')[0];
    }

    // التأكد من وجود durationDays
    if (!this.letter.durationDays) {
      this.letter.durationDays = 0;
    }
  }

  // دالة لتحويل البيانات إلى مصفوفة نصية
  private parseToArray(data: any): string[] {
    if (!data) return [];

    if (Array.isArray(data)) {
      // إذا كانت مصفوفة بالفعل
      return data.map((item: any) => {
        if (typeof item === 'string') {
          return this.decodeHtmlEntities(item);
        }
        return String(item || '');
      });
    }

    if (typeof data === 'string') {
      try {
        // محاولة تحليل JSON
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            if (typeof item === 'string') {
              return this.decodeHtmlEntities(item);
            }
            return String(item || '');
          });
        }
      } catch (e) {
        // إذا لم تكن JSON، افترض أنها نص واحد
        return [this.decodeHtmlEntities(data)];
      }
    }

    if (typeof data === 'object') {
      // إذا كانت كائن، حول قيمه إلى مصفوفة
      return Object.values(data).map((item: any) => String(item || ''));
    }

    return [String(data || '')];
  }

  // فك تشفير HTML entities
  private decodeHtmlEntities(text: string): string {
    if (!text) return '';

    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  }

  // === دوال التحقق من الصلاحيات ===

  canEditDecision(): boolean {
    if (!this.user || !this.letter) return false;
    const isUniversityPresident = this.user.role === 'UniversityPresident';
    const isCanceled = this.letter.status === 'canceled';
    return isUniversityPresident && !isCanceled;
  }

  canCancelDecision(): boolean {
    if (!this.user) return false;
    return (
      this.letter?.status === 'approved' &&
      this.user.role === 'UniversityPresident'
    );
  }

  canViewNationalId(): boolean {
    if (!this.user || !this.user._id) return false;

    if (this.user.role === 'UniversityPresident') {
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

  // === دوال التعديل ===

  // تفعيل وضع التعديل
  enableEditMode() {
    // تحضير البيانات للتعديل
    this.prepareForEdit();

    // نسخ البيانات للتعديل
    this.editData = {
      title: this.letter.title || '',
      priority: this.letter.priority || 'low',
      fullName: this.letter.fullName || '',
      entityName: this.letter.entityName || '',
      nationalId: this.letter.nationalId || '',
      phoneNumber: this.letter.phoneNumber || '',
      signatureType: this.letter.signatureType || 'حقيقية',
      description: this.letter.description || '',
      breeif: this.letter.breeif || '',
       Rationale: [...this.letter.Rationale], // نسخ المصفوفة مع الـ HTML
      descriptions: [...this.letter.descriptions],
      StartDate: this.letter.StartDate || '',
      EndDate: this.letter.EndDate || '',
      durationDays: this.letter.durationDays || 0
    };

    // إذا لم تكن هناك حيثيات، نضيف واحدة فارغة
    if (this.editData.Rationale.length === 0) {
      this.editData.Rationale.push('');
    }

    // إذا لم تكن هناك بنود، نضيف واحدة فارغة
    if (this.editData.descriptions.length === 0) {
      this.editData.descriptions.push('');
    }

    this.editMode = true;
  }

  // تحضير البيانات للتعديل
  private prepareForEdit() {
    this.originalLetter = JSON.parse(JSON.stringify(this.letter));
  }

  // تحويل HTML إلى نص عادي
  private htmlToText(html: string): string {
    if (!html) return '';

    // فك تشفير HTML entities
    const decoded = this.decodeHtmlEntities(html);

    // استبدال علامات HTML بفاصلات أو مسافات
    let text = decoded
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '') // إزالة جميع علامات HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    // إزالة الأسطر الفارغة المتكررة
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');

    return text;
  }

  // تحويل النص إلى HTML للعرض
  private textToHtml(text: string): string {
    if (!text) return '';

    let html = text
      .replace(/\n/g, '<br>')
      .replace(/  /g, ' &nbsp;')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return html;
  }

  cancelEdit() {
    this.editMode = false;
    this.editData = {};
    this.showAttachmentInput = false;
    this.newAttachmentFile = null;
    this.cdr.detectChanges();
  }

  // إضافة حيثية جديدة
  addRationale() {
    this.editData.Rationale.push('');
  }

  // حذف حيثية
  removeRationale(index: number) {
    if (this.editData.Rationale.length > 1) {
      this.editData.Rationale.splice(index, 1);
    }
  }

  // إضافة بند جديد
  addDescription() {
    this.editData.descriptions.push('');
  }

  // حذف بند
  removeDescription(index: number) {
    if (this.editData.descriptions.length > 1) {
      this.editData.descriptions.splice(index, 1);
    }
  }

  // إضافة جدول جديد
  addTable() {
    this.tableRows = 3;
    this.tableCols = 3;
    this.currentTableData = this.createEmptyTable(3, 3);
    this.editingTableIndex = null;
    this.showTableModal = true;
  }

  // تعديل جدول موجود
  editTable(index: number) {
    const description = this.editData.descriptions[index];

    // تحقق إذا كان يحتوي على جدول
    if (this.isTableDescription(description)) {
      // استخراج الجدول من HTML
      const tableData = this.extractTableDataFromHTML(description);

      if (tableData) {
        this.tableRows = tableData.rows;
        this.tableCols = tableData.cols;
        this.currentTableData = tableData.data;
        this.editingTableIndex = index;
        this.showTableModal = true;
      }
    } else {
      // إذا لم يكن جدولاً، أنشئ جدولاً جديداً من النص
      const lines = description.split('\n').filter((line: string) => line.trim());
      if (lines.length > 0) {
        this.tableRows = Math.min(lines.length, 5);
        this.tableCols = 2;
        this.currentTableData = this.createEmptyTable(this.tableRows, this.tableCols);

        // وضع النص في العمود الأول
        for (let i = 0; i < Math.min(lines.length, this.tableRows); i++) {
          this.currentTableData[i][0] = lines[i];
        }
      } else {
        this.tableRows = 3;
        this.tableCols = 3;
        this.currentTableData = this.createEmptyTable(3, 3);
      }

      this.editingTableIndex = index;
      this.showTableModal = true;
    }
  }

  // حفظ جميع التغييرات
  saveChanges() {
    this.saving = true;

    // تحويل النصوص إلى HTML
    const rationalesHtml = (this.editData.Rationale || [])
      .map((r: string) => this.textToHtml(r?.toString().trim() || ''))
      .filter((r: string) => r !== '');

    const descriptionsHtml = (this.editData.descriptions || [])
      .map((d: string) => {
        const trimmed = d?.toString().trim() || '';
        // إذا كان نصاً عادياً (ليس جدولاً)، حوّله إلى HTML
        if (!this.isTableDescription(trimmed)) {
          return this.textToHtml(trimmed);
        }
        return trimmed; // إذا كان جدولاً، اتركه كما هو
      })
      .filter((d: string) => d !== '');

    // إعداد بيانات الحفظ
    const updateData: any = {
      title: this.editData.title?.trim(),
      priority: this.editData.priority,
      fullName: this.editData.fullName?.trim() || null,
      entityName: this.editData.entityName?.trim() || null,
      nationalId: this.editData.nationalId?.trim() || null,
      phoneNumber: this.editData.phoneNumber?.trim() || null,
      signatureType: this.editData.signatureType,
      description: this.editData.description?.trim() || null,
      breeif: this.editData.breeif?.trim() || null,
      Rationale: rationalesHtml,
      descriptions: descriptionsHtml,
      durationDays: parseInt(this.editData.durationDays as any) || 0
    };

    // إضافة التواريخ إذا كانت موجودة
    if (this.editData.StartDate) {
      updateData.StartDate = new Date(this.editData.StartDate).toISOString();
    }

    if (this.editData.EndDate) {
      updateData.EndDate = new Date(this.editData.EndDate).toISOString();
    }

    // إزالة القيم الفارغة
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    this.letterService.updateLetter(this.letter._id, updateData).subscribe({
      next: (res: any) => {
        // تحديث البيانات المحلية
        this.letter = {
          ...this.letter,
          ...updateData,
          Rationale: rationalesHtml,
          descriptions: descriptionsHtml
        };

        this.saving = false;
        this.editMode = false;
        this.editData = {};

        Swal.fire({
          icon: 'success',
          title: 'تم حفظ التغييرات بنجاح',
          timer: 1500,
          showConfirmButton: false
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('خطأ في حفظ التغييرات:', err);
        this.saving = false;

        Swal.fire({
          icon: 'error',
          title: 'خطأ في الحفظ',
          text: err.error?.message || 'حدث خطأ أثناء حفظ التغييرات',
          showConfirmButton: true
        });
      }
    });
  }

  // === دوال الجداول ===

  // إنشاء جدول فارغ
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

  // تغيير حجم الجدول
  changeTableSize() {
    const newRows = Math.max(1, Math.min(20, this.tableRows));
    const newCols = Math.max(1, Math.min(10, this.tableCols));

    const newTable = this.createEmptyTable(newRows, newCols);

    // نسخ البيانات القديمة
    for (let i = 0; i < Math.min(this.currentTableData.length, newRows); i++) {
      for (let j = 0; j < Math.min(this.currentTableData[0]?.length || 0, newCols); j++) {
        newTable[i][j] = this.currentTableData[i][j];
      }
    }

    this.currentTableData = newTable;
    this.tableRows = newRows;
    this.tableCols = newCols;
  }

  // تحديث قيمة خلية
  updateCellValue(rowIndex: number, colIndex: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (this.currentTableData[rowIndex] && this.currentTableData[rowIndex][colIndex] !== undefined) {
      this.currentTableData[rowIndex][colIndex] = value;
    }
  }

  // حفظ الجدول
  saveTable() {
    if (!this.currentTableData || this.currentTableData.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'الجدول فارغ!',
        timer: 1500
      });
      return;
    }

    const tableHTML = this.generateTableHTML(this.currentTableData);

    if (this.editingTableIndex !== null && this.editingTableIndex >= 0) {
      // تحديث جدول موجود
      this.editData.descriptions[this.editingTableIndex] = tableHTML;
    } else {
      // إضافة جدول جديد
      this.editData.descriptions.push(tableHTML);
    }

    this.closeTableModal();

    Swal.fire({
      icon: 'success',
      title: 'تم حفظ الجدول بنجاح',
      timer: 1500,
      showConfirmButton: false
    });
  }

  // توليد HTML للجدول
  generateTableHTML(data: any[][]): string {
    let html = '<table class="decision-table" style="width: 100%; border-collapse: collapse; margin: 10px 0; direction: rtl;">';

    // إضافة البيانات
    data.forEach((row) => {
      html += '<tr>';
      row.forEach((cell) => {
        html += `<td style="border: 1px solid #000; padding: 8px; text-align: right;">${cell || '&nbsp;'}</td>`;
      });
      html += '</tr>';
    });

    html += '</table>';
    return html;
  }

  // إغلاق نافذة الجدول
  closeTableModal() {
    this.showTableModal = false;
    this.editingTableIndex = null;
    this.currentTableData = [];
  }

  // استخراج بيانات الجدول من HTML
  private extractTableDataFromHTML(html: string): any {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');

      if (!table) return null;

      const rows = table.querySelectorAll('tr');
      const data: any[][] = [];

      rows.forEach(row => {
        const rowData: any[] = [];
        const cells = row.querySelectorAll('td, th');

        cells.forEach(cell => {
          rowData.push(cell.textContent || '');
        });

        if (rowData.length > 0) {
          data.push(rowData);
        }
      });

      return {
        rows: data.length,
        cols: data[0] ? data[0].length : 0,
        data: data
      };
    } catch (error) {
      console.error('Error extracting table data:', error);
      return null;
    }
  }

  // === دوال المرفقات ===

  // تغيير المرفق
  changeAttachment() {
    this.showAttachmentInput = true;
  }

  // إلغاء تغيير المرفق
  cancelAttachmentChange() {
    this.showAttachmentInput = false;
    this.newAttachmentFile = null;
  }

  // اختيار ملف
  onFileSelected(event: any) {
    this.newAttachmentFile = event.target.files[0];
  }

  // رفع المرفق
  uploadAttachment() {
    if (!this.newAttachmentFile) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'يرجى اختيار ملف أولاً',
      });
      return;
    }

    const formData = new FormData();
    formData.append('attachment', this.newAttachmentFile);

    this.saving = true;
    this.archiveService.updateLetterAttachment(this.letter._id, formData).subscribe({
      next: (res: any) => {
        this.letter.attachment = res.attachment || res.data?.attachment;
        this.newAttachmentFile = null;
        this.showAttachmentInput = false;
        this.saving = false;

        Swal.fire({
          icon: 'success',
          title: 'تم تحديث المرفق بنجاح',
          timer: 1500
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('خطأ في رفع الملف:', err);
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: 'حدث خطأ أثناء رفع الملف',
        });
      },
    });
  }

  // === دوال PDF ===

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
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pdfLoading = false;
        console.error('خطأ في جلب PDF:', err);
        this.cdr.detectChanges();
      },
    });
  }

  showPdfButton(): boolean {
    return this.letter?.status === 'approved' && (!!this.pdfUrl || !!this.pdfFilename);
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

  // === دوال المساعدة ===

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

  // دالة للتحقق من أن النص يحتوي على جدول
  isTableDescription(description: string): boolean {
    if (!description || typeof description !== 'string') return false;
    return description.includes('<table') && description.includes('</table>');
  }

  // دالة لاستخراج الجدول من النص
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

  // دالة لمعالجة النصوص
  formatDescription(description: string): string {
    if (!description) return '';

    if (this.isTableDescription(description)) {
      return this.getTableFromDescription(description);
    }

    let formatted = description
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/data-start="[^"]*"/g, '')
      .replace(/data-end="[^"]*"/g, '')
      .replace(/\\n/g, '<br>')
      .replace(/<p><strong>(.*?)<\/strong><\/p>/g, '<h4 class="description-subtitle">$1</h4>')
      .replace(/<ul>/g, '<ul class="description-list">')
      .replace(/<ol>/g, '<ol class="description-list">');

    // فك تشفير HTML entities
    return this.decodeHtmlEntities(formatted);
  }

  // دالة للحصول على HTML آمن
  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
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

  // دالة لإلغاء القرار
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
        this.letterService.cancelLetter(this.letter.id || this.letter._id).subscribe({
          next: (res) => {
            this.letter.status = 'canceled';
            Swal.fire({
              icon: 'success',
              title: 'تم إلغاء القرار',
              text: 'تم إيقاف العمل بالقرار بنجاح',
              confirmButtonText: 'حسناً'
            });
            this.cdr.detectChanges();
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

  // دوال للمرفقات
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

    const apiUrl = `http://localhost:3000/api/letters/view-pdf-online-uploaded/${encodeURIComponent(fileName)}`;

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
      `http://localhost:3000/api/letters/download-uploaded/${encodeURIComponent(cleanName)}`;

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

  // دوال إضافية
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

  getSectorName(sectorId: string, sectors: { _id: string, sector: string }[]): string {
    const found = sectors.find(s => s._id === sectorId);
    return found ? found.sector : 'غير معروف';
  }

  selectNewFile(event: any) {
    this.selectedFile = event.target.files[0];
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.selectedFile = null;
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
   regeneratePDF(): void {
    this.pdfLoading = true;

    this.archiveService.regeneratePDF(this.letterId).subscribe({
      next: (response) => {
        console.log('✅ نجح:', response);
        Swal.fire({
          icon: 'success',  
          title: 'تم تحديث الـ PDF',
        });
        this.pdfLoading = false;
        
        // يمكنك تحديث البيانات أو إعادة تحميل الصفحة
        // this.loadLetterData();
      },
      error: (error) => {
        console.error('❌ خطأ:', error);
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: 'حدث خطاء في تحديث الـ PDF',
        });
        this.pdfLoading = false;
      }
    });
  }
  trackByIndex(index: number): number {
  return index;
}

}
