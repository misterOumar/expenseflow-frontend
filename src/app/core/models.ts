export type Role = 'EMPLOYEE' | 'MANAGER' | 'ACCOUNTANT';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
export type ExpenseCategory = 'MEAL' | 'TRANSPORT' | 'ACCOMMODATION' | 'SUPPLIES' | 'OTHER';
export type TransitionAction = 'submit' | 'approve' | 'reopen' | 'pay';

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ReportSummary {
  id: number;
  title: string;
  periodMonth: number;
  periodYear: number;
  status: ReportStatus;
  totalAmount: number;
  ownerId: number;
  ownerName: string;
}

export interface ReportLine {
  id: number;
  spentOn: string;
  category: ExpenseCategory;
  description: string;
  amountHt: number;
  vatAmount: number;
  amountTtc: number;
  receiptId: number | null;
}

export interface ReportDetail extends ReportSummary {
  submittedAt: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  rejectionReason: string | null;
  lines: ReportLine[];
}

export interface StatusHistoryEntry {
  fromStatus: ReportStatus;
  toStatus: ReportStatus;
  actorName: string;
  at: string;
  comment: string | null;
}

export interface Receipt {
  id: number;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface ReportRequest {
  title: string;
  periodMonth: number;
  periodYear: number;
}

export interface LineRequest {
  spentOn: string;
  category: ExpenseCategory;
  description: string;
  amountHt: number;
  vatAmount: number;
  receiptId: number | null;
}
