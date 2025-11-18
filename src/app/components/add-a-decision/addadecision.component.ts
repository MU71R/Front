import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Decision } from 'src/app/model/decision';
import { Sector, User } from 'src/app/model/user';
import { DecisionService } from 'src/app/service/decision.service';
import { AdministrationService } from 'src/app/service/user.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-addadecision',
  templateUrl: './addadecision.component.html',
  styleUrls: ['./addadecision.component.css'],
})
export class AddadecisionComponent implements OnInit {
  showFormModal = false;
  editingId: string | null = null;
  loading = true;

  form: any = {
    title: '',
    sector: [], 
    supervisor: '',
    isPresidentDecision: false,
  };

  sectors: Sector[] = [];
  reviewers: User[] = [];
  decisions: Decision[] = [];
  selectedSectors: Sector[] = [];
  filteredSectors: Sector[] = [];
  searchSector = '';
  dropdownOpen = false;

  constructor(
    private decisionService: DecisionService,
    private router: Router,
    private userservice: AdministrationService
  ) {}

  ngOnInit(): void {
    this.loadSectors();
    this.loadDecisionTypes();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-multiselect')) {
      this.dropdownOpen = false;
    }
  }

  getSectorNames(sectors: Sector[]): string {
    return sectors?.map((s) => s.sector).join('، ') || '—';
  }

  openFormModal() {
    this.resetForm();
    this.showFormModal = true;
  }

  closeFormModal() {
    this.showFormModal = false;
    this.resetForm();
  }

  loadSectors() {
    this.userservice.getAllSectors().subscribe((res: any) => {
      this.sectors = res?.data || [];
      this.filteredSectors = [...this.sectors];
    });
  }

  filterSectors() {
    this.filteredSectors = this.sectors.filter(
      (s) =>
        s.sector.toLowerCase().includes(this.searchSector.toLowerCase()) &&
        !this.selectedSectors.find((sel) => sel._id === s._id)
    );
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.filterSectors();
    }
  }

  selectSector(sector: Sector) {
    if (!this.selectedSectors.find((s) => s._id === sector._id)) {
      this.selectedSectors.push(sector);
      this.form.sector = this.selectedSectors.map((s) => s._id);
    }
    this.searchSector = '';
    this.filterSectors();
    this.dropdownOpen = false;

    this.loadReviewers(this.form.sector);
  }

  removeSector(index: number) {
    this.selectedSectors.splice(index, 1);
    this.form.sector = this.selectedSectors.map((s) => s._id);
    this.filterSectors();

    if (this.form.sector.length > 0) {
      this.loadReviewers(this.form.sector);
    } else {
      this.reviewers = [];
      this.form.supervisor = '';
    }
  }

  loadDecisionTypes() {
    this.loading = true;
    this.decisionService.getDecisionTypes().subscribe(
      (res: any) => {
        this.decisions = res || [];
        this.loading = false;
      },
      (err) => {
        console.error(err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'حدث خطأ أثناء تحميل البيانات',
          text: err.message || 'حدث خطأ أثناء تحميل البيانات',
        });
      }
    );
  }

  saveDecisionType() {
    if (!this.form.title || !this.form.sector.length) {
      Swal.fire({
        icon: 'warning',
        title: 'من فضلك املأ الحقول المطلوبة',
      });
      return;
    }

    this.form.isPresidentDecision = !!this.form.isPresidentDecision;
    this.form.supervisor = this.form.supervisor || null;

    if (this.editingId) {
      this.decisionService
        .updateDecisionType(this.editingId, this.form)
        .subscribe(
          () => {
            Swal.fire({
              icon: 'success',
              title: 'تم تعديل نوع القرار بنجاح',
              timer: 2000,
              showConfirmButton: false,
            });
            this.closeFormModal();
            this.loadDecisionTypes();
          },
          (err) =>
            Swal.fire({
              icon: 'error',
              title: 'حدث خطأ أثناء التعديل',
              text: err.message || '',
            })
        );
    } else {
      this.decisionService.addDecisionType(this.form).subscribe(
        () => {
          Swal.fire({
            icon: 'success',
            title: 'تم إضافة نوع القرار بنجاح',
            timer: 2000,
            showConfirmButton: false,
          });
          this.closeFormModal();
          this.loadDecisionTypes();
        },
        (err) =>
          Swal.fire({
            icon: 'error',
            title: 'حدث خطأ أثناء الإضافة',
            text: err.message || '',
          })
      );
    }
  }

  editDecisionType(decision: any) {
    this.editingId = decision._id;
    this.selectedSectors = decision.sector || [];
    this.form = {
      title: decision.title,
      sector: this.selectedSectors.map((s) => s._id),
      supervisor: decision.supervisor?._id || decision.supervisor || '',
      isPresidentDecision: decision.isPresidentDecision || false,
    };

    if (this.form.sector.length > 0) {
      this.loadReviewers(this.form.sector);
    }

    this.showFormModal = true;
  }

  deleteDecisionType(id: string) {
    Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذفه',
      cancelButtonText: 'إلغاء',
    }).then((result) => {
      if (result.isConfirmed) {
        this.decisionService.deleteDecisionType(id).subscribe(
          () => {
            Swal.fire({
              icon: 'success',
              title: 'تم الحذف',
              timer: 2000,
              showConfirmButton: false,
            });
            this.loadDecisionTypes();
          },
          (err) =>
            Swal.fire({
              icon: 'error',
              title: 'حدث خطأ أثناء الحذف',
              text: err.message || '',
            })
        );
      }
    });
  }

  resetForm() {
    this.form = {
      title: '',
      sector: [],
      supervisor: '',
      isPresidentDecision: false,
    };
    this.editingId = null;
    this.reviewers = [];
    this.selectedSectors = [];
    this.filteredSectors = [...this.sectors];
    this.searchSector = '';
    this.dropdownOpen = false;
  }

  loadReviewers(sectorIds: string[]) {
    if (!sectorIds || !sectorIds.length) {
      this.reviewers = [];
      this.form.supervisor = '';
      return;
    }

    const allReviewers = new Set<User>();
    let completedRequests = 0;
    const totalRequests = sectorIds.length;

    sectorIds.forEach((sectorId) => {
      this.userservice.getusersbyrole(sectorId).subscribe(
        (res: any) => {
          res?.forEach((u: User) => {
            allReviewers.add(u);
          });

          completedRequests++;

          if (completedRequests === totalRequests) {
            this.reviewers = Array.from(allReviewers);

            if (
              this.form.supervisor &&
              !this.reviewers.find((r) => r._id === this.form.supervisor)
            ) {
              this.form.supervisor = '';
            }
          }
        },
        (error) => {
          completedRequests++;
          if (completedRequests === totalRequests) {
            this.reviewers = Array.from(allReviewers);
          }
        }
      );
    });
  }
}
