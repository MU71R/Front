import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { LetterService } from 'src/app/service/letter.service';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/service/login.service';
import { Letter } from 'src/app/model/Letter';

@Component({
  selector: 'app-pending-reviews',
  templateUrl: './pending-reviews.component.html',
  styleUrls: ['./pending-reviews.component.css'],
})
export class PendingReviewsComponent implements OnInit {
  pendingList: Letter[] = [];
  filteredList: Letter[] = [];
  selectedStatus: string = 'all';
  isDropdownOpen: boolean = false;
  loading: boolean = false;
  error: string = '';

  constructor(
    private letterService: LetterService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.loginService.getUserFromLocalStorage();
    if (user?.role === 'UniversityPresident') {
      this.getUniversityPresidentLetters();
    } else {
      this.getPendingLetters();
    }
  }

  getUniversityPresidentLetters() {
    this.loading = true;
    this.error = '';
    
    this.letterService.getUniversityPresidentLetters().subscribe({
      next: (res: any) => {
        console.log('✅ Received data:', res);
        
        // 🔥 معالجة البيانات بشكل صحيح
        if (res && res.success && Array.isArray(res.data)) {
          this.pendingList = res.data;
        } else if (Array.isArray(res)) {
          this.pendingList = res;
        } else {
          console.warn('⚠️ Unexpected response format:', res);
          this.pendingList = [];
        }
        
        this.filteredList = [...this.pendingList];
        this.loading = false;
        this.cdr.detectChanges();
        
        console.log('📋 Loaded letters:', this.pendingList.length);
      },
      error: (err) => {
        console.error('❌ API Error:', err);
        this.error = 'حدث خطأ في تحميل البيانات';
        this.loading = false;
        this.pendingList = [];
        this.filteredList = [];
        this.cdr.detectChanges();
      },
    });
  }

  getPendingLetters() {
    this.loading = true;
    this.error = '';
    
    this.letterService.getLetterSupervisor().subscribe({
      next: (res: any) => {
        console.log('✅ Received data:', res);
        
        // 🔥 معالجة البيانات بشكل صحيح
        if (res && res.success && Array.isArray(res.data)) {
          this.pendingList = res.data;
        } else if (Array.isArray(res)) {
          this.pendingList = res;
        } else {
          console.warn('⚠️ Unexpected response format:', res);
          this.pendingList = [];
        }
        
        this.filteredList = [...this.pendingList];
        this.loading = false;
        this.cdr.detectChanges();
        
        console.log('📋 Loaded letters:', this.pendingList.length);
      },
      error: (err) => {
        console.error('❌ API Error:', err);
        this.error = 'حدث خطأ في تحميل البيانات';
        this.loading = false;
        this.pendingList = [];
        this.filteredList = [];
        this.cdr.detectChanges();
      },
    });
  }

  filterByStatus(status: string) {
    this.selectedStatus = status;

    if (status === 'all') {
      this.filteredList = [...this.pendingList];
    } else {
      this.filteredList = this.pendingList.filter(
        (item) => item.status === status
      );
    }

    this.closeDropdown();
    console.log('🔍 Filtered by status:', status, '- Count:', this.filteredList.length);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'in_progress':
        return 'قيد المراجعة';
      case 'pending':
        return 'معلق';
      case 'approved':
        return 'تمت الموافقة';
      case 'rejected':
        return 'مرفوض';
      case 'all':
        return 'الكل';
      default:
        return 'غير معروف';
    }
  }

  // 🔥 Helper method لعرض اسم المستخدم
  getUserDisplayName(item: Letter): string {
    if (item.user && typeof item.user === 'object') {
      return item.user.fullname || item.user.username || 'غير محدد';
    }
    return 'غير محدد';
  }

  // 🔥 Helper method لعرض المعيار الرئيسي
  getMainCriteriaName(item: Letter): string {
    if (item.mainCriteria && typeof item.mainCriteria === 'object') {
      return item.mainCriteria.name || 'غير محدد';
    }
    return 'غير محدد';
  }

  // 🔥 Helper method لعرض المعيار الفرعي
  getSubCriteriaName(item: Letter): string {
    if (item.subCriteria && typeof item.subCriteria === 'object') {
      return item.subCriteria.name || 'غير محدد';
    }
    return 'غير محدد';
  }

  // 🔥 Helper method لتنظيف HTML
  stripHtmlTags(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  open(id: string) {
    console.log('🔍 Opening letter:', id);
    this.router.navigate(['letter-details', id]);
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.closeDropdown();
    }
  }
}