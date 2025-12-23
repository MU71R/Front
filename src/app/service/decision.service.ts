import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Decision } from '../model/decision';
import { environment } from 'src/app/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DecisionService {

  baseUrl = environment.apiUrl + '/decision';

  constructor(private http: HttpClient) { }

  addDecisionType(decision: Decision) {
    return this.http.post<Decision>(`${this.baseUrl}/add-decision`, decision);
  }

  deleteDecisionType(id: string) {
    return this.http.delete<Decision>(`${this.baseUrl}/delete-decision/${id}`);
  }

  updateDecisionType(id: string, decision: Decision) {
    return this.http.put<Decision>(`${this.baseUrl}/update-decision/${id}`, decision);
  }

  getDecisionTypes() {
    return this.http.get<Decision[]>(`${this.baseUrl}/all-decisions`);
  }

   getDecisionById(id: string): Observable<any> {
    return this.http.get<Decision>(`${this.baseUrl}/get-decision/${id}`);
  }


}
