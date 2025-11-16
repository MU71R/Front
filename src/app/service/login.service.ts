import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import {
  User,
  LoginCredentials,
  LoginResponse,
  DecodedToken,
} from '../model/user';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  removeToken() {
    throw new Error('Method not implemented.');
  }
  private readonly userKey = 'userData';
  private readonly tokenKey = 'token';
  private readonly apiUrl = 'http://localhost:3000';

  private userBehaviorSubject = new BehaviorSubject<User | null>(
    this.getUserFromLocalStorage()
  );
  user$ = this.userBehaviorSubject.asObservable();

  private loggedIn = new BehaviorSubject<boolean>(
    !!localStorage.getItem(this.tokenKey)
  );
  isLoggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient) {
    const savedUser = this.getUserFromLocalStorage();
    if (savedUser) {
      this.userBehaviorSubject.next(savedUser);
      this.loggedIn.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response: LoginResponse) => {
          if (response.token) {
            localStorage.setItem(this.tokenKey, response.token);
            if (response.user) {
              this.setUser(response.user);
            } else {
              const decoded = this.decodeToken();
              if (decoded) {
                const user: User = {
                  _id: decoded.userId,
                  fullname: decoded.name ?? '',
                  username: decoded.email ?? '',
                  role: decoded.role ?? 'user',
                  sector: [],
                  status: 'active',
                };
                this.setUser(user);
              }
            }

            this.loggedIn.next(true);
          }
        }),
        catchError((error: unknown) => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userBehaviorSubject.next(null);
    this.loggedIn.next(false);
  }

  decodeToken(): DecodedToken | null {
    const token = this.getTokenFromLocalStorage();
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        return decoded;
      } catch (error) {
        console.error('Invalid token:', error);
        return null;
      }
    }
    return null;
  }

  getUserFromLocalStorage(): User | null {
    const userDataStr = localStorage.getItem(this.userKey);
    if (!userDataStr || userDataStr === 'undefined') return null;

    try {
      return JSON.parse(userDataStr) as User;
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return null;
    }
  }

  setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.userBehaviorSubject.next(user);
    this.loggedIn.next(true);
  }

  getTokenFromLocalStorage(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (!decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
}
