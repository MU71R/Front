import { Component, OnInit, TemplateRef } from '@angular/core';
import { DashboardService, DashboardStats } from '../../service/home.service';
import { LetterService } from 'src/app/service/letter.service';
import { RecentActivit } from 'src/app/model/letter-detail';

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

  constructor(
    private dashboardService: DashboardService,
    private letterService: LetterService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
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
      case 'قيد المعالجة': return 'in_progress';
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
      in_progress: 'قيد المعالجة',
    };
    return texts[status] || status;
  }
}
