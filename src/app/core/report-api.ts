import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LineRequest,
  Receipt,
  ReportDetail,
  ReportRequest,
  ReportStatus,
  ReportSummary,
  StatusHistoryEntry,
  TransitionAction,
} from './models';

@Injectable({ providedIn: 'root' })
export class ReportApi {
  private readonly http = inject(HttpClient);

  list(status?: ReportStatus): Observable<ReportSummary[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<ReportSummary[]>('/api/reports', { params });
  }

  get(id: number): Observable<ReportDetail> {
    return this.http.get<ReportDetail>(`/api/reports/${id}`);
  }

  create(request: ReportRequest): Observable<ReportDetail> {
    return this.http.post<ReportDetail>('/api/reports', request);
  }

  update(id: number, request: ReportRequest): Observable<ReportDetail> {
    return this.http.put<ReportDetail>(`/api/reports/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/reports/${id}`);
  }

  addLine(id: number, line: LineRequest): Observable<ReportDetail> {
    return this.http.post<ReportDetail>(`/api/reports/${id}/lines`, line);
  }

  updateLine(id: number, lineId: number, line: LineRequest): Observable<ReportDetail> {
    return this.http.put<ReportDetail>(`/api/reports/${id}/lines/${lineId}`, line);
  }

  removeLine(id: number, lineId: number): Observable<ReportDetail> {
    return this.http.delete<ReportDetail>(`/api/reports/${id}/lines/${lineId}`);
  }

  transition(id: number, action: TransitionAction): Observable<ReportDetail> {
    return this.http.post<ReportDetail>(`/api/reports/${id}/${action}`, null);
  }

  reject(id: number, reason: string): Observable<ReportDetail> {
    return this.http.post<ReportDetail>(`/api/reports/${id}/reject`, { reason });
  }

  history(id: number): Observable<StatusHistoryEntry[]> {
    return this.http.get<StatusHistoryEntry[]>(`/api/reports/${id}/history`);
  }

  exportPdf(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`/api/reports/${id}/export.pdf`, { observe: 'response', responseType: 'blob' });
  }

  uploadReceipt(file: File): Observable<Receipt> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<Receipt>('/api/receipts', body);
  }

  downloadReceipt(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`/api/receipts/${id}`, { observe: 'response', responseType: 'blob' });
  }
}
