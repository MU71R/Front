import { Injectable } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { AdministrationService } from './user.service';
import { LetterService } from './letter.service';
import { DecisionService } from './decision.service';
import { Letter } from '../model/Letter';
import { HttpClient } from '@angular/common/http';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalLetters: number;
  pendingLetters: number;
  approvedLetters: number;
  rejectedLetters: number;
  inProgressLetters: number;
  totalDecisions: number;
  totalinProgressLetters: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}
export interface RecentActivity {
  id: string;
  title: string;
  type: 'letter' | 'decision' | 'user';
  action: string;
  user: string;
  timestamp: Date;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(
    private adminService: AdministrationService,
    private letterService: LetterService,
    private decisionService: DecisionService,
    private http: HttpClient
  ) {}
      private baseUrl = 'http://localhost:3000/letters';
    getDashboardStats(){
            return this.http.get<DashboardStatsResponse>(`${this.baseUrl}/stats`);
    }

  getRecentActivities(): Observable<RecentActivity[]> {
    return this.letterService.getLetterTypes().pipe(
      map((letters: any) => {
        let lettersData = letters;
        if (letters && (letters as any).data) {
          lettersData = (letters as any).data;
        }

        if (!Array.isArray(lettersData)) {
          return [];
        }

        const activities = lettersData
          .slice(0, 8)
          .map((letter: any) => {
            let userName = 'مستخدم غير معروف';
            if (letter.user) {
              if (typeof letter.user === 'object') {
                userName =
                  letter.user.fullname || letter.user.username || 'مستخدم';
              } else {
                userName = 'مستخدم';
              }
            }

            return {
              id: letter._id,
              title: letter.title || 'بدون عنوان',
              type: 'letter' as const,
              action: this.getActionByStatus(letter.status),
              user: userName,
              timestamp: new Date(letter.createdAt),
              status: letter.status,
            };
          })
          .sort(
            (a: RecentActivity, b: RecentActivity) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        return activities;
      })
    );
  }

  private getActionByStatus(status: string): string {
    const actions: { [key: string]: string } = {
      pending: 'بانتظار المراجعة',
      approved: 'تمت الموافقة',
      rejected: 'تم الرفض',
      in_progress: 'قيد المعالجة',
    };
    return actions[status] || 'تم الإنشاء';
  }
}
