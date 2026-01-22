import { Component, OnInit } from '@angular/core';
import { LetterService, PDFFile } from '../../service/letter.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pdf-list',
  templateUrl: './pdf-list.component.html',
  styleUrls: ['./pdf-list.component.css'],
})
export class PdfListComponent implements OnInit {
  pdfFiles: PDFFile[] = [];
  filteredPDFs: PDFFile[] = [];
  loading: boolean = false;
  error: string = '';
  searchTerm: string = '';
  searchDate: string = '';
  pdfUrl: string | null = null;
  pdfFilename: string | null = null;
  pdfFile: any = null;
  pdfLoading: boolean = false;


  constructor(private letterService: LetterService ) {}

  ngOnInit() {
    this.loadAllPDFs();
  }

  loadAllPDFs() {
    this.loading = true;
    this.error = '';

    this.letterService.getAllPDFs().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.pdfFiles = response.pdfFiles;
          this.filteredPDFs = [...this.pdfFiles];
        } else {
          this.error = 'فشل في تحميل الملفات';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'حدث خطأ أثناء تحميل الملفات';
        console.error('Error loading PDFs:', error);
      },
    });
  }

  filterPDFs() {
    if (!this.searchTerm && !this.searchDate) {
      this.filteredPDFs = [...this.pdfFiles];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    const searchDate = this.searchDate;

    this.filteredPDFs = this.pdfFiles.filter((pdf) => {
      const textMatch =
        !term ||
        this.getFileName(pdf.pdfurl).toLowerCase().includes(term) ||
        (pdf.userId?.fullname || '').toLowerCase().includes(term) ||
        (pdf.userId?.name || '').toLowerCase().includes(term) ||
        this.getUserRoleArabic(pdf.userId?.role).toLowerCase().includes(term);

      const dateMatch =
        !searchDate || this.isSameDate(pdf.createdAt, searchDate);

      return textMatch && dateMatch;
    });
  }

  isSameDate(dateString: string, searchDate: string): boolean {
    if (!dateString || !searchDate) return false;

    const fileDate = new Date(dateString);
    const search = new Date(searchDate);

    return (
      fileDate.getFullYear() === search.getFullYear() &&
      fileDate.getMonth() === search.getMonth() &&
      fileDate.getDate() === search.getDate()
    );
  }

  getFileName(url: string): string {
    return url.split('/').pop() || 'ملف غير معروف';
  }

  
 openPdf(pdf: PDFFile): void {
  if (!pdf || !pdf.pdfurl) {
    Swal.fire({
      icon: 'error',
      title: 'خطأ',
      text: 'لا يوجد ملف PDF متاح للفتح',
    });
    return;
  }

  let finalUrl = pdf.pdfurl;

  // لو الرابط مش كامل
  if (!finalUrl.startsWith('http')) {
    finalUrl = 'https://localhost:3000' + finalUrl;
  }

  window.open(finalUrl, '_blank');
}



  downloadPDF(pdf: PDFFile) {
    const filename = this.getFileName(pdf.pdfurl);
    const downloadName = `document_${pdf._id}.pdf`;
    this.letterService.downloadPDF(filename, downloadName);
  }

  getRoleBadgeClass(role: string | undefined): string {
    switch (role) {
      case 'admin':
        return 'bg-danger';
      case 'supervisor':
        return 'bg-primary';
      case 'UniversityPresident':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  getRoleIcon(role: string | undefined): string {
    switch (role) {
      case 'admin':
        return 'fa-user-shield';
      case 'supervisor':
        return 'fa-user-check';
      case 'UniversityPresident':
        return 'fa-user-tie';
      default:
        return 'fa-user';
    }
  }

  getUserRoleArabic(role: string | undefined): string {
    const roleMap: { [key: string]: string } = {
      admin: 'مدير النظام',
      supervisor: 'مراجع',
      UniversityPresident: 'رئيس الجامعة',
       preparer: 'مستخدم',
    };
    return roleMap[role || 'user'] || role || 'مستخدم';
  }

  getDisplayRole(role: string | undefined): string {
    return this.getUserRoleArabic(role);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  clearSearch() {
    this.searchTerm = '';
    this.filterPDFs();
  }

  clearDateFilter() {
    this.searchDate = '';
    this.filterPDFs();
  }

  onDateChange(event: any) {
    this.searchDate = event.target.value;
    this.filterPDFs();
  }
}
