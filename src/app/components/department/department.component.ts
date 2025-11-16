import { Component, OnInit } from '@angular/core';
import { User, Sector } from '../../model/user';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AdministrationService } from 'src/app/service/user.service';

@Component({
  selector: 'app-department',
  templateUrl: './department.component.html',
  styleUrls: ['./department.component.css'],
})
export class DepartmentComponent implements OnInit {
  users: User[] = [];
  sectors: Sector[] = [];
  filteredList: User[] = [];
  loading = false;
  activeTab: 'users' | 'sectors' = 'users';
  searchTerm = '';

  selectedFilterSector: string = '';

  showAddDepartmentModal = false;
  showEditUserModal = false;
  showSectorForm = false;
  showPassword = false;
  showEditPassword = false;
  showNewPassword = false;

  newDepartment: Partial<User> & { _id?: string } = {
    fullname: '',
    username: '',
    password: '',
    role: 'preparer',
    sector: [],
  };

  selectedAddSectors: Sector[] = [];
  filteredAddSectors: Sector[] = [];
  searchAddSector = '';
  addDropdownOpen = false;

  selectedUser: Partial<User> & { _id?: string } = {
    sector: [],
  };

  selectedEditSectors: Sector[] = [];
  filteredEditSectors: Sector[] = [];
  searchEditSector = '';
  editDropdownOpen = false;

  newSector: Sector = { _id: '', sector: '' };
  editPasswordData = {
    newPassword: '',
    confirmPassword: '',
  };

  constructor(private adminService: AdministrationService) {}

  ngOnInit(): void {
    this.loadSectors();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (data) => {
        const usersArray = Array.isArray(data)
          ? data
          : (data as { data: User[] }).data;
        this.users = (usersArray || [])
          .filter((u) => u.username && u.fullname)
          .map((u) => {
            let sectorIds: string[] = [];
            let sectorNames: string[] = [];

            type SectorType = string | { _id: string; sector: string };

            if (Array.isArray(u.sector)) {
              sectorIds = u.sector.map((s: SectorType) =>
                typeof s === 'string' ? s : s._id || ''
              );
              sectorNames = u.sector.map((s: SectorType) =>
                typeof s === 'string'
                  ? this.sectors.find((sec) => sec._id === s)?.sector || '---'
                  : s.sector || '---'
              );
            } else if (u.sector) {
              const s = u.sector as SectorType;
              sectorIds = [typeof s === 'string' ? s : s._id || ''];
              sectorNames = [
                typeof s === 'string'
                  ? this.sectors.find((sec) => sec._id === s)?.sector || '---'
                  : s.sector || '---',
              ];
            }
            return {
              _id: u._id,
              fullname: u.fullname,
              username: u.username,
              role: u.role,
              sector: sectorIds,
              sectorName: sectorNames.join(', '),
              status: u.status,
            };
          });
        this.applyFilters();
      },
      error: (err: HttpErrorResponse) =>
        console.error('خطأ في جلب المستخدمين:', err.message),
      complete: () => (this.loading = false),
    });
  }

  loadSectors(): void {
    this.adminService.getAllSectors().subscribe({
      next: (res) => {
        const sectorsData = (res as any).data || res;
        this.sectors = (sectorsData || [])
          .filter((s: Sector) => s.sector)
          .map((s: Sector) => ({ _id: s._id || '', sector: s.sector }));

        this.filteredAddSectors = [...this.sectors];
        this.filteredEditSectors = [...this.sectors];
      },
      error: (err: HttpErrorResponse) =>
        Swal.fire({
          icon: 'error',
          title: 'خطأ في جلب القطاعات',
          text: err.message,
        }),
    });
  }

  applyFilters(): void {
    this.filteredList = this.users.filter((user) => {
      const matchSector = this.selectedFilterSector
        ? user.sector.includes(this.selectedFilterSector)
        : true;
      const matchName = this.searchTerm
        ? user.fullname?.toLowerCase().includes(this.searchTerm.toLowerCase())
        : true;
      return matchSector && matchName;
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedFilterSector = '';
    this.applyFilters();
  }

  toggleAddDropdown() {
    this.addDropdownOpen = !this.addDropdownOpen;
  }

  filterAddSectors() {
    this.filteredAddSectors = this.sectors.filter(
      (s) =>
        s.sector.toLowerCase().includes(this.searchAddSector.toLowerCase()) &&
        !this.selectedAddSectors.find((sel) => sel._id === s._id)
    );
  }

  selectAddSector(sector: Sector) {
    if (!this.selectedAddSectors.find((s) => s._id === sector._id)) {
      this.selectedAddSectors.push(sector);
      this.newDepartment.sector = this.selectedAddSectors
        .map((s) => s._id)
        .filter((id) => id !== '') as string[];
    }
    this.searchAddSector = '';
    this.filterAddSectors();
  }

  removeAddSector(index: number) {
    this.selectedAddSectors.splice(index, 1);
    this.newDepartment.sector = this.selectedAddSectors
      .map((s) => s._id)
      .filter((id) => id !== '') as string[];
    this.filterAddSectors();
  }

  toggleEditDropdown() {
    this.editDropdownOpen = !this.editDropdownOpen;
  }

  filterEditSectors() {
    this.filteredEditSectors = this.sectors.filter(
      (s) =>
        s.sector.toLowerCase().includes(this.searchEditSector.toLowerCase()) &&
        !this.selectedEditSectors.find((sel) => sel._id === s._id)
    );
  }

  selectEditSector(sector: Sector) {
    if (!this.selectedEditSectors.find((s) => s._id === sector._id)) {
      this.selectedEditSectors.push(sector);
      this.selectedUser.sector = this.selectedEditSectors
        .map((s) => s._id)
        .filter((id) => id !== '') as string[];
    }
    this.searchEditSector = '';
    this.filterEditSectors();
  }

  removeEditSector(index: number) {
    this.selectedEditSectors.splice(index, 1);
    this.selectedUser.sector = this.selectedEditSectors
      .map((s) => s._id)
      .filter((id) => id !== '') as string[];
    this.filterEditSectors();
  }

  toggleStatus(user: User): void {
    if (!user._id) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    this.adminService.updateUserStatus(user._id, newStatus).subscribe({
      next: () => (user.status = newStatus),
      error: (err: HttpErrorResponse) =>
        Swal.fire({
          icon: 'error',
          title: 'خطأ في تحديث الحالة',
          text: err.message,
        }),
    });
  }

  openAddDepartment(): void {
    this.newDepartment = {
      fullname: '',
      username: '',
      password: '',
      role: 'preparer',
      sector: [],
    };
    this.selectedAddSectors = [];
    this.filteredAddSectors = [...this.sectors];
    this.searchAddSector = '';
    this.showPassword = false;
    this.showAddDepartmentModal = true;
  }

  closeAddDepartment(): void {
    this.showAddDepartmentModal = false;
  }

  openEditUser(user: User): void {
    this.selectedUser = { ...user };

    this.selectedEditSectors = this.sectors.filter((s) => {
      const sectorId = s._id;
      if (!sectorId) return false;

      if (Array.isArray(user.sector)) {
        return user.sector.includes(sectorId);
      } else {
        return user.sector === sectorId;
      }
    });
    this.filteredEditSectors = [...this.sectors];
    this.searchEditSector = '';

    this.showEditUserModal = true;
  }

  closeEditUser(): void {
    this.showEditUserModal = false;
    this.selectedUser = {};
    this.selectedEditSectors = [];
  }

  togglePassword(field: 'add' | 'edit' | 'new'): void {
    if (field === 'add') this.showPassword = !this.showPassword;
    else if (field === 'edit') this.showEditPassword = !this.showEditPassword;
    else this.showNewPassword = !this.showNewPassword;
  }

  async changePassword(): Promise<void> {
    const { newPassword, confirmPassword } = this.editPasswordData;
    if (!newPassword || !confirmPassword) {
      await Swal.fire({ icon: 'warning', title: 'جميع الحقول مطلوبة' });
      return;
    }
    if (newPassword !== confirmPassword) {
      await Swal.fire({
        icon: 'warning',
        title: 'كلمة المرور الجديدة غير متطابقة',
      });
      return;
    }
    if (!this.selectedUser._id) return;

    this.adminService
      .updateUser(this.selectedUser._id, { password: newPassword })
      .subscribe({
        next: async () => {
          await Swal.fire({
            icon: 'success',
            title: 'تم تحديث كلمة المرور بنجاح',
            timer: 2000,
            showConfirmButton: false,
          });
          this.editPasswordData = { newPassword: '', confirmPassword: '' };
          this.showEditPassword = false;
        },
        error: async (err: HttpErrorResponse) => {
          await Swal.fire({
            icon: 'error',
            title: 'خطأ في تحديث كلمة المرور',
            text: err.message || 'حدث خطأ',
          });
        },
      });
  }

  async confirmEditUser(): Promise<void> {
    const { fullname, username, role } = this.selectedUser;
    const sector = this.selectedEditSectors
      .map((s) => s._id)
      .filter((id) => id !== '') as string[];

    if (!fullname?.trim() || !username?.trim() || !role || !sector.length) {
      await Swal.fire({ icon: 'warning', title: 'املأ جميع الحقول' });
      return;
    }

    const payload: Partial<User> = {
      fullname: fullname.trim(),
      username: username.trim(),
      role,
      status: this.selectedUser.status,
      sector,
    };

    if (!this.selectedUser._id) return;

    this.adminService.updateUser(this.selectedUser._id, payload).subscribe({
      next: () => {
        this.loadUsers();
        this.closeEditUser();
      },
      error: (err: HttpErrorResponse) =>
        Swal.fire({
          icon: 'error',
          title: 'خطأ أثناء تعديل المستخدم',
          text: err.message,
        }),
    });
  }

  deleteUser(user: User): void {
    if (!user._id) return;

    Swal.fire({
      title: `هل أنت متأكد من حذف المستخدم ${user.fullname}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذفه',
      cancelButtonText: 'إلغاء',
    }).then((res) => {
      if (!res.isConfirmed || !user._id) return;
      this.adminService
        .deleteUser(user._id)
        .subscribe({ next: () => this.loadUsers() });
    });
  }

  openSectorForm(): void {
    this.newSector = { _id: '', sector: '' };
    this.showSectorForm = true;
  }

  closeSectorForm(): void {
    this.showSectorForm = false;
    this.newSector = { _id: '', sector: '' };
  }

  editSector(sector: Sector): void {
    this.newSector = { ...sector };
    this.showSectorForm = true;
  }

  saveSector(): void {
    if (!this.newSector.sector?.trim()) {
      Swal.fire({ icon: 'warning', title: 'اسم القطاع مطلوب' });
      return;
    }

    const payload = { sector: this.newSector.sector.trim() };
    if (this.newSector._id) {
      this.adminService.updateSector(this.newSector._id, payload).subscribe({
        next: () => {
          this.closeSectorForm();
          this.loadSectors();
          this.loadUsers();
        },
      });
    } else {
      this.adminService.addSector(payload as Sector).subscribe({
        next: () => {
          this.closeSectorForm();
          this.loadSectors();
        },
      });
    }
  }

  deleteSector(id?: string): void {
    if (!id) return;
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع بعد الحذف!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذفه',
      cancelButtonText: 'إلغاء',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.adminService.deleteSector(id).subscribe({
        next: () => {
          this.loadSectors();
          this.loadUsers();
        },
      });
    });
  }

  saveDepartment(): void {
    const { fullname, username, password, role } = this.newDepartment;
    const sector = this.selectedAddSectors
      .map((s) => s._id)
      .filter((id) => id !== '') as string[];

    if (
      !fullname?.trim() ||
      !username?.trim() ||
      !password ||
      !role ||
      !sector.length
    ) {
      Swal.fire({ icon: 'warning', title: 'املأ جميع الحقول' });
      return;
    }

    const userData: User = {
      ...(this.newDepartment as User),
      sector: sector,
    };

    this.adminService.addUser(userData).subscribe({
      next: () => {
        this.loadUsers();
        this.closeAddDepartment();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'خطأ في الإضافة',
          text: err.message,
        });
      },
    });
  }

  getSectorNames(sectorIds: string[]): string {
    if (!sectorIds || !sectorIds.length) return '—';

    const sectorNames = sectorIds.map((id) => {
      const sector = this.sectors.find((s) => s._id === id);
      return sector?.sector || '---';
    });

    return sectorNames.join('، ');
  }
}
