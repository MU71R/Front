import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeArEg from '@angular/common/locales/ar-EG';
registerLocaleData(localeArEg);
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DepartmentComponent } from './components/department/department.component';
import { AddadecisionComponent } from './components/add-a-decision/addadecision.component';
import { AuthInterceptor } from './interceptors/auth';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { DeclarationComponent } from './components/declaration/declaration.component';
import { EditorModule } from '@tinymce/tinymce-angular';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LayoutComponent } from './components/layout/layout.component';
import { PendingReviewsComponent } from './components/pending-reviews/pending-reviews.component';
import { LetterDetailComponent } from './components/letter-detail/letter-detail.component';
import { ArchiveComponent } from './components/archive/archive.component';
import { ArchiveDetailComponent } from './components/archive-detail/archive-detail.component';
import { HomeComponent } from './components/home/home.component';
import { LetterDetailsComponent } from './components/archived-letter-details/archived-letter-details.component';
import { NotificationComponent } from './components/notification/notification.component';
import { PdfListComponent } from './components/pdf-list/pdf-list.component';
import { RejectedLettersListComponent } from './components/rejected-letters-list/rejected-letters-list.component';
import { RejectedLetterDetailsComponent } from './components/rejected-letter-details/rejected-letter-details.component';
import { NgxEditorModule } from 'ngx-editor';
import { QuillModule } from 'ngx-quill';
import { DepartmentCriteriaManagementComponent } from './components/department-criteria-management/department-criteria-management.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { CanceledLettersListComponent } from './components/canceled-letters-list/canceled-letters-list.component';
import { CanceledLetterDetailsComponent } from './components/canceled-letter-details/canceled-letter-details.component';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { DraftLettersComponent } from './components/drafts/drafts.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DepartmentComponent,
    AddadecisionComponent,
    DeclarationComponent,
    SidebarComponent,
    LayoutComponent,
    PendingReviewsComponent,
    LetterDetailComponent,
    ArchiveComponent,
    ArchiveDetailComponent,
    HomeComponent,
    LetterDetailsComponent,
    NotificationComponent,
    PdfListComponent,
    RejectedLettersListComponent,
    RejectedLetterDetailsComponent,
    DepartmentCriteriaManagementComponent,
    CanceledLettersListComponent,
    CanceledLetterDetailsComponent,
    SafeHtmlPipe,
    DraftLettersComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    EditorModule,
    NgxEditorModule,
    NgSelectModule,
    QuillModule.forRoot(),
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      preventDuplicates: true,
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'ar-EG' },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
