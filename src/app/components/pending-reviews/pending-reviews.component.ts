import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { addLetter } from 'src/app/model/Letter';
import { LetterService } from 'src/app/service/letter.service';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/service/login.service';

@Component({
  selector: 'app-pending-reviews',
  templateUrl: './pending-reviews.component.html',
  styleUrls: ['./pending-reviews.component.css'],
})
export class PendingReviewsComponent implements OnInit {
  pendingList: addLetter[] = [];
  filteredList: addLetter[] = [];
  selectedStatus: string = 'all';
  isDropdownOpen: boolean = false;

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
    this.letterService.getUniversityPresidentLetters().subscribe({
      next: (res: any) => {
        this.pendingList = res.data ? res.data : res;
        this.filteredList = [...this.pendingList];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('API Error:', err),
    });
  }

  getPendingLetters() {
    this.letterService.getLetterSupervisor().subscribe({
      next: (res: any) => {
        this.pendingList = res.data ? res.data : res;
        this.filteredList = [...this.pendingList];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('API Error:', err),
    });
  }

  // filterByStatus(status: string) {
  //   this.selectedStatus = status;

  //   if (status === 'all') {
  //     this.filteredList = [...this.pendingList];
  //   } else {
  //     this.filteredList = this.pendingList.filter(
  //       (item) => item.status === status
  //     );
  //   }

  //   this.closeDropdown();
  // }

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

  open(id: string) {
    this.router.navigate(['letter-details', id]);
  }

  // toggleDropdown() {
  //   this.isDropdownOpen = !this.isDropdownOpen;
  // }

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
