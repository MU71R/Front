import { Component, OnInit, TemplateRef } from '@angular/core';
import { DashboardService, DashboardStats } from '../../service/home.service';
import { LetterService } from 'src/app/service/letter.service';
import { RecentActivit } from 'src/app/model/letter-detail';
import { AuthService } from 'src/app/service/auth.service';
import { User } from 'src/app/model/user';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  stats: DashboardStats = {
    totalLetters: 0,
    pendingLetters: 0,
    approvedLetters: 0,
    inProgressLetters: 0,
    totalinProgressLetters: 0,
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    rejectedLetters: 0,
    totalDecisions: 0,
  };

  recentLetters: RecentActivit[] = [];
  loadingTemplate!: TemplateRef<any>;
  loading = true;
  currentDate = new Date();
  user: User | null = null;

  constructor(
    private dashboardService: DashboardService,
    private letterService: LetterService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadDashboardData();
  }

  getCurrentUser(): void {
    // جلب بيانات المستخدم الحالي
    this.user = this.authService.currentUserValue;

    // الاشتراك للتحديثات (اختياري)
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });
  }

  // دالة لتحويل اسم الدور العربي
  getUserRoleDisplayName(): string {
    if (!this.user?.role) return 'مستخدم';

    const roleNames: { [key: string]: string } = {
      admin: 'مدير النظام',
      supervisor: 'مراجع',
      UniversityPresident: 'رئيس الجامعة',
      preparer: 'معد القرارت',
    };

    return roleNames[this.user.role] || 'مستخدم';
  }

  loadDashboardData(): void {
    this.loading = true;

    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.loading = false;
      },
    });

    this.getRecentLetters();
  }

  getRecentLetters() {
    this.letterService.recentLetters().subscribe({
      next: (res: { success: boolean; activities: RecentActivit[] }) => {
        if (res && res.activities) {
          this.recentLetters = res.activities.map(a => ({
            id: a.id,
            message: a.message,
            time: a.time,
            status: this.extractStatusFromMessage(a.message)
          }));
        }
      },
      error: (err) => {
        console.error('حدث خطأ عند جلب البيانات:', err);
      }
    });
  }

  extractStatusFromMessage(msg: string): string {
    const match = msg.match(/الحالة الحالية:\s*(.+)/);
    if (!match) return '';
    const statusArabic = match[1].trim();
    switch (statusArabic) {
      case 'مقبول': return 'approved';
      case 'مرفوض': return 'rejected';
      case 'قيد المراجعة': return 'in_progress';
      case 'قيد الانتظار': return 'pending';
      default: return 'pending';
    }
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      in_progress: 'info',
    };
    return colors[status] || 'secondary';
  }

  getStatusText(status: string): string {
    const texts: { [key: string]: string } = {
      pending: 'قيد الانتظار',
      approved: 'مقبول',
      rejected: 'مرفوض',
      in_progress: 'قيد المراجعة',
    };
    return texts[status] || status;
  }
}
