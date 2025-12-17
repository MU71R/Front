import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/service/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage = '';
  isLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      username: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(20)],
      ],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    const loggedOut = localStorage.getItem('loggedOut');
    if (loggedOut) {
      this.toastr.info('تم تسجيل الخروج بنجاح', 'تسجيل الخروج');
      localStorage.removeItem('loggedOut');
    }

    this.loginForm.valueChanges.subscribe(() => {
      this.errorMessage = '';
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  login(): void {
    if (this.loginForm.invalid) {
      Object.values(this.f).forEach((control) => control.markAsTouched());
      this.toastr.warning('يرجى إدخال البيانات بشكل صحيح', 'تحذير');
      return;
    }

    this.isLoading = true;
    const credentials = {
      username: this.loginForm.value.username.trim(),
      password: this.loginForm.value.password,
    };

    this.authService
      .login(credentials) // استدعاء login من AuthService
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;

          if (response.token && response.user) {
            // تحديث حالة المستخدم في AuthService
            this.authService.loginManually(response.token, response.user);

            this.toastr.success('تم تسجيل الدخول بنجاح!', 'نجاح');

            // توجيه حسب الدور
            const role = response.user.role;
            if (role === 'admin') {
              this.router.navigate(['/dashboard-admin']);
            } else {
              this.router.navigate(['/home']);
            }
          } else {
            this.errorMessage = 'لم يتم استلام بيانات الدخول بشكل صحيح.';
            this.toastr.error(this.errorMessage, 'خطأ');
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error?.error?.message || 'حدث خطأ غير متوقع.';
          this.toastr.error(this.errorMessage, 'فشل تسجيل الدخول');
        },
      });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  logout(): void {
    this.authService.logout();
  }
}
