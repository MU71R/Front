import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';
import { LetterService } from 'src/app/service/letter.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-canceled-letters-list',
  templateUrl: './canceled-letters-list.component.html',
  styleUrls: ['./canceled-letters-list.component.css'],
})
export class CanceledLettersListComponent implements OnInit {
  // Data
  canceledLetters: any[] = [];
  filteredLetters: any[] = [];
  paginatedLetters: any[] = [];
  
  // Loading
  loading = true;
  
  // Statistics
  totalCanceled = 0;
  canceledThisMonth = 0;
  canceledToday = 0;
  
  // Filters
  searchQuery = '';
  filterDateFrom = '';
  filterDateTo = '';
  filterType = '';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  startIndex = 0;
  endIndex = 0;

  constructor(
    private router: Router,
    private archiveService: ArchiveService,
    private authService: AuthService,
    private letterService: LetterService
  ) {}

  user = this.authService.currentUserValue;

  ngOnInit(): void {
    this.loadCanceledLetters();
  }

  /**
   * تحميل القرارات الملغاة من الـ API
   */
  loadCanceledLetters() {
    this.loading = true;
    this.letterService.getCanceledLetters().subscribe({
      next: (res: any) => {
        this.canceledLetters = res?.data || [];
        this.calculateStatistics();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('خطأ أثناء جلب القرارات الملغاة:', err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: 'حدث خطأ أثناء تحميل القرارات الملغاة',
        });
      },
    });
  }

  /**
   * حساب الإحصائيات
   */
  calculateStatistics() {
    this.totalCanceled = this.canceledLetters.length;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const today = now.toDateString();
    
    this.canceledThisMonth = this.canceledLetters.filter(letter => {
      if (!letter.canceledAt) return false;
      const canceledDate = new Date(letter.canceledAt);
      return canceledDate.getMonth() === currentMonth && 
             canceledDate.getFullYear() === currentYear;
    }).length;
    
    this.canceledToday = this.canceledLetters.filter(letter => {
      if (!letter.canceledAt) return false;
      const canceledDate = new Date(letter.canceledAt);
      return canceledDate.toDateString() === today;
    }).length;
  }

  /**
   * تطبيق الفلاتر
   */
  applyFilters() {
    let filtered = [...this.canceledLetters];
    
    // فلتر البحث
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(letter => 
        letter.title?.toLowerCase().includes(query) ||
        letter.transactionNumber?.toString().includes(query)
      );
    }
    
    // فلتر التاريخ من
    if (this.filterDateFrom) {
      const fromDate = new Date(this.filterDateFrom);
      filtered = filtered.filter(letter => {
        if (!letter.canceledAt) return false;
        return new Date(letter.canceledAt) >= fromDate;
      });
    }
    
    // فلتر التاريخ إلى
    if (this.filterDateTo) {
      const toDate = new Date(this.filterDateTo);
      toDate.setHours(23, 59, 59, 999); // نهاية اليوم
      filtered = filtered.filter(letter => {
        if (!letter.canceledAt) return false;
        return new Date(letter.canceledAt) <= toDate;
      });
    }
    
    // فلتر النوع
    if (this.filterType) {
      filtered = filtered.filter(letter => letter.letterType === this.filterType);
    }
    
    // ترتيب حسب تاريخ الإلغاء (الأحدث أولاً)
    filtered.sort((a, b) => {
      const dateA = new Date(a.canceledAt || a.createdAt).getTime();
      const dateB = new Date(b.canceledAt || b.createdAt).getTime();
      return dateB - dateA;
    });
    
    this.filteredLetters = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * مسح الفلاتر
   */
  clearFilters() {
    this.searchQuery = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterType = '';
    this.applyFilters();
  }

  /**
   * تحديث البيانات المعروضة حسب الصفحة
   */
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredLetters.length / this.itemsPerPage);
    this.startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.endIndex = Math.min(this.startIndex + this.itemsPerPage, this.filteredLetters.length);
    
    this.paginatedLetters = this.filteredLetters.slice(this.startIndex, this.endIndex);
  }

  /**
   * الانتقال إلى الصفحة التالية
   */
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  /**
   * الانتقال إلى الصفحة السابقة
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  /**
   * الانتقال إلى صفحة معينة
   */
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  /**
   * تغيير عدد العناصر في الصفحة
   */
  onItemsPerPageChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * عرض تفاصيل القرار
   */
  viewDetails(letter: any) {
    this.router.navigate(['/canceled-letter-details', letter._id || letter.id]);
  }

  /**
   * تحديث القائمة
   */
  refreshList() {
    this.loadCanceledLetters();
  }

  /**
   * استرجاع القرار الملغي
   */
  // restoreDecision(letter: any) {
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
  //       this.letterService.restoreLetter(letter._id || letter.id).subscribe({
  //         next: (res) => {
  //           Swal.fire({
  //             icon: 'success',
  //             title: 'تم الاسترجاع',
  //             text: 'تم استرجاع القرار بنجاح',
  //             confirmButtonText: 'حسناً'
  //           });
  //           this.loadCanceledLetters();
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
   * الحصول على اسم الشخص الذي ألغى القرار
   */
  getCanceledByName(canceledBy: any): string {
    if (typeof canceledBy === 'string') {
      return canceledBy;
    }
    return canceledBy?.fullname || 'غير محدد';
  }

  /**
   * الحصول على class الـ badge حسب النوع
   */
  getTypeBadgeClass(type: string): string {
    const badgeMap: { [key: string]: string } = {
      'رئاسة الجمهورية': 'badge-presidential',
      'وزارة التعليم العالي': 'badge-ministerial',
      'رئاسة الوزراء': 'badge-governmental',
      'اخرى': 'badge-another',
      'عامة': 'badge-general',
    };
    return badgeMap[type] || 'badge-general';
  }

  /**
   * الحصول على أيقونة النوع
   */
  getTypeIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'رئاسة الجمهورية': 'fa-flag',
      'وزارة التعليم العالي': 'fa-graduation-cap',
      'رئاسة الوزراء': 'fa-landmark',
      'اخرى': 'fa-file',
      'عامة': 'fa-file',
    };
    return iconMap[type] || 'fa-file';
  }
}