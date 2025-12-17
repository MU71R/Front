import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

// Import interfaces from model
import { User, LoginCredentials, LoginResponse, DecodedToken } from '../model/user';

// ============= Auth Service =============
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Constants
  private readonly USER_KEY = 'userData';
  private readonly TOKEN_KEY = 'token';
  private readonly API_URL = 'http://localhost:3000';

  // State Management
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  private loggedInSubject: BehaviorSubject<boolean>;
  public isLoggedIn$: Observable<boolean>;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Initialize with saved data
    const savedUser = this.getUserFromStorage();
    const hasToken = !!this.getToken();

    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();

    this.loggedInSubject = new BehaviorSubject<boolean>(hasToken && !!savedUser);
    this.isLoggedIn$ = this.loggedInSubject.asObservable();
  }

  // ============= Getters =============
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // ============= Authentication Methods =============
  
  /**
   * Login with credentials
   */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap((response: LoginResponse) => {
          // Check if login was successful
          if (response.success && response.token) {
            this.handleLoginSuccess(response);
          } else {
            console.error('Login failed:', response.message || 'Unknown error');
          }
        }),
        catchError((error: unknown) => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Manual login (when token and user data are already available)
   */
  loginManually(token: string, userData: User): void {
    this.setToken(token);
    this.setUser(userData);
    this.loggedInSubject.next(true);
  }

  /**
   * Logout and clear all session data
   */
  logout(): void {
    this.clearStorage();
    this.currentUserSubject.next(null);
    this.loggedInSubject.next(false);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  /**
   * Check if user is logged in with valid token
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    const user = this.currentUserValue;

    if (!token || !user) {
      return false;
    }

    return this.isTokenValid();
  }

  // ============= Token Management =============

  /**
   * Get token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Set token in localStorage
   */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Decode JWT token
   */
  getDecodedToken(): DecodedToken | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode<DecodedToken>(token);
    } catch (error) {
      console.error('Invalid token:', error);
      return null;
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  isTokenValid(): boolean {
    const decoded = this.getDecodedToken();
    if (!decoded || !decoded.exp) {
      return false;
    }

    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    return !this.isTokenValid();
  }

  // ============= User Management =============

  /**
   * Get user from localStorage
   */
  private getUserFromStorage(): User | null {
    const userDataStr = localStorage.getItem(this.USER_KEY);
    
    if (!userDataStr || userDataStr === 'undefined') {
      return null;
    }

    try {
      return JSON.parse(userDataStr) as User;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Set user data
   */
  setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.loggedInSubject.next(true);
  }

  /**
   * Update current user data
   */
  updateUser(user: User): void {
    this.setUser(user);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserValue;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserValue?._id || null;
  }

  // ============= Role Checks =============

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.currentUserValue?.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user is supervisor
   */
  isSupervisor(): boolean {
    return this.hasRole('supervisor');
  }

  /**
   * Check if user is university president
   */
  isUniversityPresident(): boolean {
    return this.hasRole('UniversityPresident');
  }

  /**
   * Check if user is regular user
   */
  isUser(): boolean {
    return this.hasRole('user');
  }

  // ============= Permission Checks =============

  /**
   * Check if user can edit letter
   */
  canEditLetter(letterUserId: string): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    if (this.isAdmin()) return true;

    return user._id === letterUserId;
  }

  /**
   * Check if user can delete letter
   */
  canDeleteLetter(letterUserId: string): boolean {
    return this.isAdmin() || this.canEditLetter(letterUserId);
  }

  /**
   * Check if user can create letter
   */
  canCreateLetter(): boolean {
    const user = this.currentUserValue;
    return !!user && (this.isAdmin() || this.isUser());
  }

  /**
   * Check if user can view all letters
   */
  canViewAllLetters(): boolean {
    return (
      this.isAdmin() || 
      this.isUniversityPresident() || 
      this.isSupervisor()
    );
  }

  /**
   * Check if supervisor can update status
   */
  canUpdateStatusBySupervisor(): boolean {
    return this.isSupervisor();
  }

  /**
   * Check if president can update status
   */
  canUpdateStatusByPresident(): boolean {
    return this.isUniversityPresident();
  }

  /**
   * Check if user can review letter based on status
   */
  canReviewLetter(letterStatus: string): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    switch (letterStatus) {
      case 'pending':
        return this.isSupervisor();
      case 'in_progress':
        return this.isUniversityPresident();
      default:
        return false;
    }
  }

  /**
   * Check if user has access to specific sector
   */
  hasSectorAccess(letterSectorId: string): boolean {
    const user = this.currentUserValue;
    if (!user) return false;

    // Admin has access to all sectors
    if (this.isAdmin()) return true;

    // If user has no sector, allow access
    if (!user.sector) return true;

    // Handle both string and array
    const userSectors = this.getUserSectors();
    return userSectors.includes(letterSectorId);
  }

  /**
   * Get user sectors as array (normalized)
   */
  getUserSectors(user?: User | null): string[] {
    const currentUser = user || this.currentUserValue;
    if (!currentUser?.sector) return [];

    // If already array, return it
    if (Array.isArray(currentUser.sector)) {
      return currentUser.sector;
    }

    // If string, return as single-item array
    return [currentUser.sector];
  }

  /**
   * Check if user has multiple sectors
   */
  hasMultipleSectors(user?: User | null): boolean {
    const sectors = this.getUserSectors(user);
    return sectors.length > 1;
  }

  /**
   * Check if user has specific sector
   */
  hasSector(sectorId: string, user?: User | null): boolean {
    const sectors = this.getUserSectors(user);
    return sectors.includes(sectorId);
  }

  /**
   * Check if user is the owner of the letter
   */
  isLetterOwner(letterUserId: string): boolean {
    const currentUserId = this.getCurrentUserId();
    return currentUserId === letterUserId;
  }

  /**
   * Get user department
   */
  getUserDepartment(): string | undefined {
    return this.currentUserValue?.department;
  }

  /**
   * Get user sector name
   */
  getUserSectorName(): string | undefined {
    return this.currentUserValue?.sectorName;
  }

  /**
   * Check if user has department
   */
  hasDepartment(): boolean {
    return !!this.currentUserValue?.department;
  }

  /**
   * Get user email
   */
  getUserEmail(): string | undefined {
    return this.currentUserValue?.email;
  }

  /**
   * Check if user status is active
   */
  isActiveUser(): boolean {
    return this.currentUserValue?.status === 'active';
  }

  /**
   * Check if user is preparer role
   */
  isPreparer(): boolean {
    return this.hasRole('preparer');
  }

  // ============= Private Helper Methods =============

  /**
   * Handle successful login
   */
  private handleLoginSuccess(response: LoginResponse): void {
    // Validate token exists
    if (!response.token) {
      console.error('Login response missing token');
      return;
    }

    this.setToken(response.token);

    if (response.user) {
      // Ensure user has required fields with defaults
      const userData: User = {
        _id: response.user._id,
        username: response.user.username,
        fullname: response.user.fullname,
        role: response.user.role,
        sector: response.user.sector,
        status: response.user.status || 'active',
        sectorName: response.user.sectorName,
        department: response.user.department,
        email: response.user.email,
      };
      this.setUser(userData);
    } else {
      // Try to create user from token
      const decoded = this.getDecodedToken();
      if (decoded) {
        const user: User = {
          _id: decoded.userId,
          fullname: decoded.name ?? '',
          username: decoded.email ?? decoded.userId,
          role: decoded.role ?? 'admin',
          sector: this.normalizeSector(decoded.sector),
          status: 'active',
          email: decoded.email,
        };
        this.setUser(user);
      }
    }

    this.loggedInSubject.next(true);
  }

  /**
   * Normalize sector to always be an array or undefined
   */
  private normalizeSector(sector?: string | string[]): string[] | undefined {
    if (!sector) return undefined;
    if (Array.isArray(sector)) return sector;
    return [sector];
  }

  /**
   * Clear all storage data
   */
  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}