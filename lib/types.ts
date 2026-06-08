export type InvoiceStatus = "paid" | "pending" | "overdue" | "draft";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  amount: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  invoiceCount: number;
}
