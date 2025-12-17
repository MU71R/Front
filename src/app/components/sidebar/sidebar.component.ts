import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'src/app/model/user';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  isSidebarOpen = false;
  user: User | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private userSubscription?: Subscription;

  @Output() sidebarToggled = new EventEmitter<boolean>();

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.subscribeToUser();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkScreenSize();
      });
      this.resizeObserver.observe(document.body);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  @HostListener('window:orientationchange')
  onOrientationChange(): void {
    setTimeout(() => this.checkScreenSize(), 100);
  }

  private checkScreenSize(): void {
    this.isSidebarOpen = window.innerWidth >= 992;
    this.sidebarToggled.emit(this.isSidebarOpen);

    if (this.isSidebarOpen) {
      document.body.classList.add('sidebar-open-mobile');
    } else {
      document.body.classList.remove('sidebar-open-mobile');
    }
  }

  private subscribeToUser(): void {
    // اشترك في currentUser$ من AuthService
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });
  }

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

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.sidebarToggled.emit(this.isSidebarOpen);

    if (this.isSidebarOpen) {
      document.body.classList.add('sidebar-open-mobile');
    } else {
      document.body.classList.remove('sidebar-open-mobile');
    }
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
    this.sidebarToggled.emit(this.isSidebarOpen);
    document.body.classList.remove('sidebar-open-mobile');
  }

  logout(): void {
    this.authService.logout(); // ينظف الجلسة ويرجع login
  }
}
