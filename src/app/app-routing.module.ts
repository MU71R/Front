import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DepartmentComponent } from './components/department/department.component';
import { AddadecisionComponent } from './components/add-a-decision/addadecision.component';
import { DeclarationComponent } from './components/declaration/declaration.component';
import { LayoutComponent } from './components/layout/layout.component';
import { PendingReviewsComponent } from './components/pending-reviews/pending-reviews.component';
import { LetterDetailComponent } from './components/letter-detail/letter-detail.component';
import { ArchiveComponent } from './components/archive/archive.component';
import { ArchiveDetailComponent } from './components/archive-detail/archive-detail.component';
import { HomeComponent } from './components/home/home.component';
import { LetterDetailsComponent } from './components/archived-letter-details/archived-letter-details.component';
import { PdfListComponent } from './components/pdf-list/pdf-list.component';

import { AuthGuard } from './guards/auth.guard';
import { LoggedInGuard } from './guards/logged-in.guard';
import { RejectedLettersListComponent } from './components/rejected-letters-list/rejected-letters-list.component';
import { RejectedLetterDetailsComponent } from './components/rejected-letter-details/rejected-letter-details.component';
import { DepartmentCriteriaManagementComponent } from './components/department-criteria-management/department-criteria-management.component';
import { CanceledLettersListComponent } from './components/canceled-letters-list/canceled-letters-list.component';
import { CanceledLetterDetailsComponent } from './components/canceled-letter-details/canceled-letter-details.component';
import { DraftLettersComponent } from './components/drafts/drafts.component';
const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [LoggedInGuard] },

  {
    path: '',
    component: LayoutComponent,
  children: [
    { path: '', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'drafts', component: DraftLettersComponent, canActivate: [AuthGuard] },
    { path: 'department', component: DepartmentComponent, canActivate: [AuthGuard] },
    { path: 'add-decision', component: AddadecisionComponent, canActivate: [AuthGuard] },
    { path: 'declaration', component: DeclarationComponent, canActivate: [AuthGuard] },
    { path: 'pending-reviews', component: PendingReviewsComponent, canActivate: [AuthGuard] },
    { path: 'letter-details/:id', component: LetterDetailComponent, canActivate: [AuthGuard] },
    { path: 'archive', component: ArchiveComponent, canActivate: [AuthGuard] },
    { path: 'archive-detail', component: ArchiveDetailComponent, canActivate: [AuthGuard] },
    // { path: 'pdf-list', component: PdfListComponent, canActivate: [AuthGuard] },
    { path: 'rejected-letters', component: RejectedLettersListComponent, canActivate: [AuthGuard] },
    { path: 'rejected-letter-details/:id', component: RejectedLetterDetailsComponent, canActivate: [AuthGuard] },
    { path: 'department-criteria-management', component: DepartmentCriteriaManagementComponent, canActivate: [AuthGuard] },
    { path: 'canceled-letters', component: CanceledLettersListComponent, canActivate: [AuthGuard] },
    { path: 'canceled-letter-details/:id', component: CanceledLetterDetailsComponent, canActivate: [AuthGuard] },
    // صفحة بدون AuthGuard
    { path: 'letter-detail/:id', component: LetterDetailsComponent },
  ],
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
