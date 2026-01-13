import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';
import { LetterService } from 'src/app/service/letter.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-archive-detail',
  templateUrl: './archive-detail.component.html',
  styleUrls: ['./archive-detail.component.css'],
})
export class ArchiveDetailComponent implements OnInit {
  type = '';
  letters: any[] = [];
  filteredLetters: any[] = [];
  loading = true;
  showUploadModal = false;
  uploading = false;
  deleting = false;
  searchTerm = '';
  filters = {
    fromDate: '',
    toDate: '',
    sender: '',
    mainCriteria: '',
    subCriteria: '',
  };

  dateRange = {
    startDate: '',
    endDate: '',
  };
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  sortField = 'createdAt';
  sortDirection = 'desc';

  uniqueSenders: string[] = [];
  uniqueMainCriteria: string[] = [];
  filteredSubCriteria: string[] = [];

  newArchive = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    transactionNumber: '' ,
    letterType: 'رئاسة الجمهورية',
    file: null as File | null,
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private archiveService: ArchiveService,
    private authService: AuthService,
    private letterService: LetterService
  ) {}
  user = this.authService.currentUserValue;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.type = params['type'] || localStorage.getItem('archiveType') || '';
      if (this.type) {
        localStorage.setItem('archiveType', this.type);
      }
      if (this.type === 'شخصي') {
        this.getPersonalArchive();
      } else if (this.type === 'مراجع') {
        this.getArchivedSupervisor();
      } else {
        this.getArchivedLettersByType(this.type);
      }
    });
  }

  trackByLetterId(index: number, letter: any): string {
    return letter._id;
  }

  getPersonalArchive(): void {
    this.loading = true;
    this.archiveService.getPersonalArchive().subscribe({
      next: (res: any) => {
        this.letters = res?.data || [];
        this.initializeFilters();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('خطأ أثناء جلب الأرشيف الشخصي:', err);
        this.loading = false;
        this.showError('حدث خطأ أثناء جلب الأرشيف الشخصي');
      },
    });
  }

  getArchivedSupervisor(): void {
    this.loading = true;
    this.archiveService.getArchivedsupervisor().subscribe({
      next: (res: any) => {
        this.letters = res?.data || [];
        this.initializeFilters();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('خطأ أثناء جلب أرشيف المراجع:', err);
        this.loading = false;
        this.showError('حدث خطأ أثناء جلب أرشيف المراجع');
      },
    });
  }

  getArchivedLettersByType(type: string): void {
    this.loading = true;
    this.archiveService.getArchivedLettersByType(type).subscribe({
      next: (res: any) => {
        this.letters = res?.data || [];
        this.initializeFilters();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('خطأ أثناء جلب الأرشيف:', err);
        this.loading = false;
        this.showError('حدث خطأ أثناء جلب الأرشيف');
      },
    });
  }

  initializeFilters(): void {
    this.extractUniqueSenders();
    this.extractUniqueMainCriteria();
    this.applyFilters();
  }

  extractUniqueSenders(): void {
    const senders = this.letters
      .map((letter) => letter.user?.fullname)
      .filter((name) => name && name.trim() !== '');

    this.uniqueSenders = [...new Set(senders)].sort();
  }

  extractUniqueMainCriteria(): void {
    const mainCriteria = this.letters
      .map((letter) => letter.mainCriteria?.name)
      .filter((name) => name && name.trim() !== '');

    this.uniqueMainCriteria = [...new Set(mainCriteria)].sort();
  }

  onMainCriteriaChange(): void {
    this.filters.subCriteria = '';

    if (this.filters.mainCriteria) {
      const lettersWithSelectedMainCriteria = this.letters.filter(
        letter => letter.mainCriteria?.name === this.filters.mainCriteria
      );

      const subCriteriaNames = lettersWithSelectedMainCriteria
        .map(letter => letter.subCriteria?.name)
        .filter(name => name && name.trim() !== '');

      this.filteredSubCriteria = [...new Set(subCriteriaNames)].sort();
    } else {
      this.filteredSubCriteria = [];
    }

    this.applyFilters();
  }

  applyFilters(): void {
  let filtered = [...this.letters];

  if (this.searchTerm) {
    const term = this.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (letter) =>
        letter.title?.toLowerCase().includes(term) ||
        letter.user?.fullname?.toLowerCase().includes(term) ||
        letter.breeif?.toLowerCase().includes(term) ||
        letter.mainCriteria?.name?.toLowerCase().includes(term) ||
        letter.subCriteria?.name?.toLowerCase().includes(term)
    );
  }

  // حل مشكلة التاريخ - FIXED
  if (this.filters.fromDate) {
    filtered = filtered.filter(
      (letter) => new Date(letter.createdAt) >= new Date(this.filters.fromDate)
    );
  }

  if (this.filters.toDate) {
    // إضافة يوم كامل إلى تاريخ الانتهاء لتضمين اليوم نفسه
    const toDatePlusOneDay = new Date(this.filters.toDate);
    toDatePlusOneDay.setDate(toDatePlusOneDay.getDate() + 1);

    filtered = filtered.filter(
      (letter) => new Date(letter.createdAt) < toDatePlusOneDay
    );
  }

  if (this.dateRange.startDate) {
    filtered = filtered.filter(
      (letter) =>
        letter.StartDate &&
        new Date(letter.StartDate) >= new Date(this.dateRange.startDate)
    );
  }

  if (this.dateRange.endDate) {
    // نفس الحل لتاريخ انتهاء القرار
    const endDatePlusOneDay = new Date(this.dateRange.endDate);
    endDatePlusOneDay.setDate(endDatePlusOneDay.getDate() + 1);

    filtered = filtered.filter(
      (letter) =>
        letter.EndDate &&
        new Date(letter.EndDate) < endDatePlusOneDay
    );
  }

  if (this.filters.sender) {
    filtered = filtered.filter(
      (letter) => letter.user?.fullname === this.filters.sender
    );
  }

  if (this.filters.mainCriteria) {
    filtered = filtered.filter(
      (letter) => letter.mainCriteria?.name === this.filters.mainCriteria
    );
  }

  if (this.filters.subCriteria) {
    filtered = filtered.filter(
      (letter) => letter.subCriteria?.name === this.filters.subCriteria
    );
  }

  filtered = this.sortLetters(filtered);

  this.filteredLetters = filtered;
  this.currentPage = 1;
  this.calculateTotalPages();
}

  sortLetters(letters: any[]): any[] {
    return letters.sort((a, b) => {
      let valueA, valueB;

      switch (this.sortField) {
        case 'title':
          valueA = a.title?.toLowerCase() || '';
          valueB = b.title?.toLowerCase() || '';
          break;
        case 'user.fullname':
          valueA = a.user?.fullname?.toLowerCase() || '';
          valueB = b.user?.fullname?.toLowerCase() || '';
          break;
        case 'createdAt':
          valueA = new Date(a.createdAt);
          valueB = new Date(b.createdAt);
          break;
        default:
          valueA = a[this.sortField];
          valueB = b[this.sortField];
      }

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filters = {
      fromDate: '',
      toDate: '',
      sender: '',
      mainCriteria: '',
      subCriteria: '',
    };
    this.dateRange = {
      startDate: '',
      endDate: '',
    };
    this.filteredSubCriteria = [];
    this.sortField = 'createdAt';
    this.sortDirection = 'desc';
    this.currentPage = 1;
    this.applyFilters();
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredLetters.length / this.pageSize);
  }

  getPages(): number[] {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get paginatedLetters(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredLetters.slice(startIndex, startIndex + this.pageSize);
  }

  viewLetterDetails(letterId: string): void {
    this.router.navigate(['/letter-detail', letterId]);
  }

  // وظيفة حذف القرار - جديدة
  deleteArchive(letterId: string, letterTitle: string): void {
    Swal.fire({
      title: 'تأكيد الحذف',
      text: `هل أنت متأكد من حذف "${letterTitle}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      position: 'top',
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleting = true;
        this.letterService.deleteLetter(letterId).subscribe({
          next: (res: any) => {
            this.deleting = false;
            this.showSuccess('تم حذف القرار بنجاح');
            this.reloadData();
          },
          error: (err: any) => {
            this.deleting = false;
            console.error('خطأ أثناء الحذف:', err);
            this.showError('حدث خطأ أثناء حذف القرار');
          },
        });
      }
    });
  }

  // دالة للتحقق من صلاحية الحذف
  canDelete(): boolean {
    return this.user?.role === 'UniversityPresident';
  }

  getArchiveTitle(): string {
    const titles: { [key: string]: string } = {
      شخصي: 'الأرشيف الشخصي',
      مراجع: 'أرشيف المراجع',
      'رئاسة الجمهورية': 'أرشيف رئاسة الجمهورية',
      'وزارة التعليم العالي': 'أرشيف وزارة التعليم العالي',
      'رئاسة الوزراء': 'أرشيف رئاسة الوزراء',
      عامة: 'الأرشيف العام',
      اخرى: 'الأرشيف اخرى',
    };
    return titles[this.type] || `أرشيف ${this.type}`;
  }

  getArchiveSubtitle(): string {
    const subtitles: { [key: string]: string } = {
      شخصي: 'القرارت والقرارات التي أرسلتها أو استلمتها',
      مراجع: 'القرارات التي وافق عليها المراجع الخاص بك',
      'رئاسة الجمهورية': 'مراسيم وقرارات رئاسية',
      'وزارة التعليم العالي': 'قرارات ووثائق وزارة التعليم العالي',
      'رئاسة الوزراء': 'قرارات مجلس الوزراء الرسمية',
      عامة: 'قرارات ووثائق الجامعة الرسمية',
      اخرى: 'قرارات ووثائق الجامعة الرسمية',
    };
    return (
      subtitles[this.type] || 'قائمة القرارت والأوامر المعتمدة ضمن هذا التصنيف'
    );
  }

  getFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  removeFile(): void {
    this.newArchive.file = null;
  }

  isSpecialArchive(): boolean {
    const allowed = [
      'رئاسة الوزراء',
      'رئاسة الجمهورية',
      'وزارة التعليم العالي',
      'اخرى'
    ];
    return allowed.includes(this.type);
  }

  openUploadModal(): void {
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.newArchive.file = null;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        this.showError('حجم الملف يجب أن يكون أقل من 10MB');
        return;
      }
      this.newArchive.file = file;
    }
  }

  uploadArchive(): void {
    if (!this.newArchive.title || !this.newArchive.letterType) {
      this.showError('الرجاء إدخال العنوان ونوع الأرشيف');
      return;
    }

    const start = new Date(this.newArchive.startDate);
    const end = new Date(this.newArchive.endDate);

    if (end <= start) {
      this.showError('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء');
      return;
    }

    let transactionNumber = Number(this.newArchive.transactionNumber);
    if(isNaN(transactionNumber)){
      this.showError('رقم القرار يجب أن يكون رقم');
      return;
    }

    this.uploading = true;

    const formData = new FormData();
    formData.append('title', this.newArchive.title);
    formData.append('breeif', this.newArchive.description || '');
    formData.append('transactionNumber', this.newArchive.transactionNumber || '');
    formData.append('letterType', this.newArchive.letterType);
    formData.append('startDate', this.newArchive.startDate);
    formData.append('endDate', this.newArchive.endDate);
    if (this.newArchive.file) {
      formData.append('file', this.newArchive.file);
    }

    this.archiveService.addArchive(formData).subscribe({
      next: (res: any) => {
        this.uploading = false;
        this.showUploadModal = false;
        this.showSuccess('تم رفع الأرشيف بنجاح');
        this.resetForm();
        this.reloadData();
      },
      error: (err: any) => {
        this.uploading = false;
        console.error('خطأ أثناء الرفع:', err);
        this.showError('حدث خطأ أثناء رفع الأرشيف');
      },
    });
  }

  private reloadData(): void {
    if (this.type === 'شخصي') {
      this.getPersonalArchive();
    } else if (this.type === 'مراجع') {
      this.getArchivedSupervisor();
    } else {
      this.getArchivedLettersByType(this.type);
    }
  }

  private resetForm(): void {
    this.newArchive = {
      title: '',
      description: '',
      transactionNumber: '',
      startDate: '',
      endDate: '',
      letterType: 'رئاسة الجمهورية',
      file: null,
    };
  }

  private showSuccess(message: string): void {
    Swal.fire({
      icon: 'success',
      title: message,
      showConfirmButton: false,
      timer: 2000,
      position: 'top-start',
    });
  }

  private showError(message: string): void {
    Swal.fire({
      icon: 'error',
      title: message,
      showConfirmButton: false,
      timer: 3000,
      position: 'top-start',
    });
  }
}