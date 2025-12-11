import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { NotificationService } from 'src/app/service/notification.service';
import { Notification } from 'src/app/model/notification';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css'],
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  isLoading = false;
  showNotificationsModal = false;
  activeFilter: string = 'all';
  unreadCount = 0;

  private notificationsSubscription!: Subscription;

  constructor(
    private notificationService: NotificationService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
    this.notificationService.fetchNotificationsFromServer();
  }

  ngOnDestroy(): void {
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.isLoading = true;

    this.notificationsSubscription = this.notificationService.notifications$.subscribe({
      next: (data) => {
        this.notifications = data;
        this.updateFilteredNotifications();
        this.updateUnreadCount();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('خطأ أثناء تحميل الإشعارات:', err);
        this.toastr.error('حدث خطأ أثناء تحميل الإشعارات', 'خطأ');
        this.isLoading = false;
      },
    });
  }

  updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter((n) => !n.seen).length;
  }

  openNotificationsModal(): void {
    this.showNotificationsModal = true;
    this.notificationService.fetchNotificationsFromServer();
    
    // تعليم جميع الإشعارات غير المقروءة كمقروءة تلقائياً عند فتح المودال
    this.markAllUnreadAsSeen();
  }

  closeNotificationsModal(): void {
    this.showNotificationsModal = false;
  }

  // دالة جديدة: تعليم جميع الإشعارات غير المقروءة كمقروءة تلقائياً
  markAllUnreadAsSeen(): void {
    const unreadNotifications = this.notifications.filter(n => !n.seen);
    
    if (unreadNotifications.length === 0) return;

    // تعليم كل إشعار غير مقروء
    unreadNotifications.forEach(notification => {
      this.notificationService.markAsRead(notification._id).subscribe({
        next: (updatedNotif: Notification) => {
          const index = this.notifications.findIndex((n) => n._id === notification._id);
          if (index !== -1) {
            this.notifications[index] = updatedNotif;
          }
          this.updateUnreadCount();
        },
        error: (err) => {
          console.error('خطأ أثناء تعليم الإشعار كمقروء:', err);
        },
      });
    });
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.updateFilteredNotifications();
  }

  updateFilteredNotifications(): void {
    if (this.activeFilter === 'all') {
      this.filteredNotifications = [...this.notifications].sort((a, b) => {
        // غير مقروء أولاً
        if (!a.seen && b.seen) return -1;
        if (a.seen && !b.seen) return 1;

        // تحذير/منتهي أولاً (error)
        if (a.type === 'error' && b.type !== 'error') return -1;
        if (a.type !== 'error' && b.type === 'error') return 1;

        // تحذير قرب الانتهاء (warning)
        if (a.type === 'warning' && b.type !== 'warning') return -1;
        if (a.type !== 'warning' && b.type === 'warning') return 1;

        // موافقة (success)
        if (a.type === 'success' && b.type !== 'success') return -1;
        if (a.type !== 'success' && b.type === 'success') return 1;

        // معلومات (info)
        if (a.type === 'info' && b.type !== 'info') return -1;
        if (a.type !== 'info' && b.type === 'info') return 1;

        // الباقي حسب الوقت (الأحدث أولاً)
        return new Date(b.createdAt || b.timestamp || 0).getTime() -
          new Date(a.createdAt || a.timestamp || 0).getTime();
      });
    } else if (this.activeFilter === 'unread') {
      this.filteredNotifications = this.notifications.filter(n => !n.seen);
    } else {
      this.filteredNotifications = this.notifications.filter(n => n.type === this.activeFilter);
    }
  }

  markAsReadAndDelete(_id: string): void {
    this.notificationService.markAsRead(_id).subscribe({
      next: (updatedNotif: Notification) => {
        const index = this.notifications.findIndex((n) => n._id === _id);
        if (index !== -1) {
          this.notifications[index] = updatedNotif;
        }
        this.notificationService.deleteNotification(_id).subscribe({
          next: () => {
            this.notifications = this.notifications.filter(
              (n) => n._id !== _id
            );
            this.updateUnreadCount();
            this.updateFilteredNotifications();
            this.toastr.success(
              'تم حذف الإشعار بنجاح',
              'تم بنجاح'
            );
          },
          error: (err) => {
            console.error('خطأ أثناء حذف الإشعار:', err);
            this.toastr.error('حدث خطأ أثناء حذف الإشعار', 'خطأ');
          },
        });
      },
      error: (err) => {
        console.error('خطأ أثناء التعليم كمقروء:', err);
        this.toastr.error('حدث خطأ أثناء تعليم الإشعار كمقروء', 'خطأ');
      },
    });
  }

  markAllAsReadAndDelete(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notificationService.clearAllNotifications().subscribe({
          next: () => {
            this.notifications = [];
            this.updateUnreadCount();
            this.updateFilteredNotifications();
            this.toastr.success(
              'تم حذف جميع الإشعارات بنجاح',
              'تم بنجاح'
            );
          },
          error: (err) => {
            console.error('خطأ أثناء حذف جميع الإشعارات:', err);
            this.toastr.error('حدث خطأ أثناء حذف جميع الإشعارات', 'خطأ');
          },
        });
      },
      error: (err) => {
        console.error('خطأ أثناء تعليم الكل كمقروء:', err);
        this.toastr.error('حدث خطأ أثناء تعليم جميع الإشعارات كمقروءة', 'خطأ');
      },
    });
  }

  hasUnreadNotifications(): boolean {
    return this.notifications.some((n) => !n.seen);
  }

  isRead(notification: Notification): boolean {
    return !!notification.seen;
  }

  getTypeLabel(type: string): string {
    const map: any = {
      info: 'معلومة',
      warning: 'تحذير',
      success: 'موافقة',
      error: 'رفض / منتهي',
    };
    return map[type] || 'أخرى';
  }

  getNotificationIcon(type: string): string {
    const icons: any = {
      info: '📢',
      warning: '⚠️',
      success: '✅',
      error: '❌',
    };
    return icons[type] || '🔔';
  }

  getNotificationClass(type: string): string {
    const classes: any = {
      info: 'notification-info',
      warning: 'notification-warning',
      success: 'notification-success',
      error: 'notification-error',
    };
    return classes[type] || 'notification-default';
  }

  formatTimeAgo(timestamp?: string): string {
    if (!timestamp) return '';
    const now = new Date().getTime();
    const time = new Date(timestamp).getTime();
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    const days = Math.floor(diff / 86400);
    return days === 1 ? 'أمس' : `منذ ${days} يوم`;
  }

  refreshNotifications(): void {
    this.isLoading = true;
    this.notificationService.fetchNotificationsFromServer();
  }

  deleteNotification(_id: string): void {
    this.notificationService.deleteNotification(_id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((n) => n._id !== _id);
        this.updateUnreadCount();
        this.updateFilteredNotifications();
        this.toastr.success('تم حذف الإشعار بنجاح', 'تم بنجاح');
      },
      error: (err) => {
        console.error('خطأ أثناء حذف الإشعار:', err);
        this.toastr.error('حدث خطأ أثناء حذف الإشعار', 'خطأ');
      },
    });
  }

  markAsReadOnly(_id: string): void {
    this.notificationService.markAsRead(_id).subscribe({
      next: (updatedNotif: Notification) => {
        const index = this.notifications.findIndex((n) => n._id === _id);
        if (index !== -1) {
          this.notifications[index] = updatedNotif;
        }
        this.updateUnreadCount();
        this.updateFilteredNotifications();
      },
      error: (err) => {
        console.error('خطأ أثناء التعليم كمقروء:', err);
        this.toastr.error('حدث خطأ أثناء تعليم الإشعار كمقروء', 'خطأ');
      },
    });
  }

  // دالة جديدة: تعليم إشعار واحد كمقروء عند الضغط عليه أو عرضه
  onNotificationClick(notification: Notification): void {
    // إذا كان غير مقروء، نعلمه كمقروء تلقائياً
    if (!notification.seen) {
      this.markAsReadOnly(notification._id);
    }
  }

  isExpiredNotification(notification: Notification): boolean {
    return notification.title === 'تنبيه: قرار منتهي';
  }

  isExpiringNotification(notification: Notification): boolean {
    return notification.title === 'تنبيه: قرار على وشك الانتهاء';
  }

  getNotificationCountByType(type: string): number {
    return this.notifications.filter(n => n.type === type).length;
  }

  getRecentExpiringNotifications(limit: number = 3): Notification[] {
    return this.notifications
      .filter(n => n.type === 'warning' || n.type === 'error')
      .slice(0, limit);
  }

  // دالة جديدة: حذف جميع الإشعارات المقروءة فقط
  deleteAllReadNotifications(): void {
    const readNotifications = this.notifications.filter(n => n.seen);
    
    if (readNotifications.length === 0) {
      this.toastr.info('لا توجد إشعارات مقروءة للحذف', 'معلومة');
      return;
    }

    // حذف كل الإشعارات المقروءة
    readNotifications.forEach(notification => {
      this.notificationService.deleteNotification(notification._id).subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n._id !== notification._id);
          this.updateUnreadCount();
          this.updateFilteredNotifications();
        },
        error: (err) => {
          console.error('خطأ أثناء حذف الإشعار:', err);
        },
      });
    });

    this.toastr.success(`تم حذف ${readNotifications.length} إشعار مقروء`, 'تم بنجاح');
  }

  // دالة جديدة: الحصول على إحصائيات الإشعارات
  getNotificationStats() {
    return {
      total: this.notifications.length,
      unread: this.notifications.filter(n => !n.seen).length,
      error: this.getNotificationCountByType('error'),
      warning: this.getNotificationCountByType('warning'),
      success: this.getNotificationCountByType('success'),
      info: this.getNotificationCountByType('info'),
    };
  }
}