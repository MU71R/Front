import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ArchiveService } from 'src/app/service/archive.service';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.css'],
})
export class ArchiveComponent implements OnInit, OnDestroy {
  loading = false;
  user: any = null;
  statsArchived: any;

  private userSub!: Subscription;

  constructor(
    private router: Router,
    private archiveService: ArchiveService,
    private authService: AuthService
  ) {}

 ngOnInit(): void {
  this.authService.currentUser$.subscribe(user => {
    console.log('ARCHIVE USER:', user);
    this.user = user;
  });

  this.getStatsArchived();
}

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  /** ================= صلاحيات العرض ================= */

  canViewHighLevelArchives(): boolean {
    if (!this.user) return false;

    const allowedRoles = ['UniversityPresident'];
    const allowedNames = [
      'مكتب رئيس الجامعة',
      'نائب رئيس الجامعة لشئون التعليم والطلاب',
      'نائب رئيس الجامعة لشئون الدراسات العليا والبحوث',
      'نائب رئيس الجامعة لشئون البيئة وخدمة المجتمع',
      'أمين عام الجامعة',
      'أمين عام الجامعة المساعد',
    ];

    return (
      allowedRoles.includes(this.user.role) ||
      allowedNames.includes(this.user.fullname)
    );
  }

  isSupervisor(): boolean {
    return this.user?.role === 'supervisor';
  }

  /** ================= التنقل ================= */

  getArchivedLettersByType(type: string) {
    this.loading = true;
    this.router.navigate(['/archive-detail'], { queryParams: { type } })
      .finally(() => this.loading = false);
  }

  openPersonalArchive() {
    this.loading = true;
    this.router.navigate(['/archive-detail'], {
      queryParams: { type: 'شخصي' },
    }).finally(() => this.loading = false);
  }

  getArchivedSupervisor() {
    this.loading = true;
    this.router.navigate(['/archive-detail'], {
      queryParams: { type: 'مراجع' },
    }).finally(() => this.loading = false);
  }

  /** ================= البيانات ================= */

  getStatsArchived() {
    this.loading = true;
    this.archiveService.getStatsArchived().subscribe({
      next: (res) => {
        this.statsArchived = res;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
