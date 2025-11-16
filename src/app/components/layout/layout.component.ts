import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = true;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.checkScreenSize();
  }

  ngOnDestroy(): void {}

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isSidebarOpen = window.innerWidth >= 993;
  }

  onSidebarToggle(isOpen: boolean): void {
    this.isSidebarOpen = isOpen;
  }

 isUserLoggedIn(): boolean {
  const loggedIn = this.authService.isLoggedIn();
  return loggedIn;
}


  getLayoutClass(): string {
    if (!this.isUserLoggedIn()) {
      return 'no-sidebar'; // class جديدة لو مش مسجّل دخول
    }
    return this.isSidebarOpen ? 'sidebar-open' : 'sidebar-closed';
  }
}
