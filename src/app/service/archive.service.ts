import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environments/environment';
@Injectable({
  providedIn: 'root',
})
export class ArchiveService {
  constructor(private http: HttpClient) {}

  url = environment.apiUrl + '/letters';

  getAllArchivedLetters() {
    return this.http.get(this.url + '/get-all-archived-letters');
  }

  getArchivedLettersByType(type: string) {
    return this.http.get(this.url + '/get-archived/' + type);
  }

  addArchive(formData: FormData): Observable<any> {
    return this.http.post(`${this.url}/add-archive`, formData, {});
  }

  getPersonalArchive() {
    return this.http.get(this.url + '/get-user-archived-letters');
  }

  getArchivedsupervisor() {
    return this.http.get(this.url + '/get-reviewer-archives');
  }

  getLetterById(id: string): Observable<any> {
    return this.http.get(`${this.url}/get-letter/${id}`);
  }

  updateLetterAttachment(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.url}/update-archive-letter/${id}`, formData);
  }

  getStatsArchived() {
    return this.http.get(this.url + '/stats-archiv');
  }
}