export interface Notification {
  _id: string;
  user: string;
  title: string; // ✅ مطلوب الآن
  message: string;
  letter?: string; // معرف القرار المرتبط
  type: 'info' | 'warning' | 'success' | 'error'; // ✅ أنواع الإشعارات
  seen: boolean; // ✅ تم التغيير من read إلى seen
  createdAt?: string;
  timestamp?: string; // للتوافق مع الكود القديم
  updatedAt?: string;
}

// ✅ Interface إضافي للإشعارات المفصلة
export interface DetailedNotification extends Notification {
  letterTitle?: string; // عنوان القرار
  senderName?: string; // اسم المرسل
  daysLeft?: number; // الأيام المتبقية (للإشعارات القريبة من الانتهاء)
  expiredDate?: string;// تاريخ الانتهاء
}

// ✅ نوع مساعد لفلترة الإشعارات
export type NotificationFilter = 'all' | 'unread' | 'info' | 'warning' | 'success' | 'error';

// ✅ Interface لإحصائيات الإشعارات
export interface NotificationStats {
  total: number;
  unread: number;
  info: number;
  warning: number;
  success: number;
  error: number;
}