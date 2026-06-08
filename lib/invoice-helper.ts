import { Invoice, InvoiceStatus } from "./types";

// Helper to format date as YYYY-MM-DD
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generate relative dates for our seed data
const todayDate = new Date();

const fiveDaysAgo = new Date();
fiveDaysAgo.setDate(todayDate.getDate() - 5);

const yesterday = new Date();
yesterday.setDate(todayDate.getDate() - 1);

const tomorrow = new Date();
tomorrow.setDate(todayDate.getDate() + 1);

const tenDaysLater = new Date();
tenDaysLater.setDate(todayDate.getDate() + 10);

const fifteenDaysLater = new Date();
fifteenDaysLater.setDate(todayDate.getDate() + 15);

export const DEFAULT_INVOICES: Invoice[] = [
  {
    id: "inv_1",
    invoiceNumber: "INV-2026-001",
    clientName: "Acme Corporation",
    clientEmail: "billing@acme.com",
    issueDate: formatDateString(fiveDaysAgo),
    dueDate: formatDateString(yesterday), // Yesterday, pending -> will auto-flag to overdue on load!
    amount: 15400.00,
    status: "pending",
    items: [
      { id: "item_1", description: "Strategic Branding Design Phase 1", quantity: 1, price: 10000 },
      { id: "item_2", description: "UI Design & Prototyping System", quantity: 6, price: 900 }
    ],
    notes: "Please reference INV-2026-001 in bank wire transfers."
  },
  {
    id: "inv_2",
    invoiceNumber: "INV-2026-002",
    clientName: "Nebula Ventures",
    clientEmail: "accounts@nebula.io",
    issueDate: formatDateString(tenDaysLater),
    dueDate: formatDateString(fifteenDaysLater),
    amount: 4500.00,
    status: "pending",
    items: [
      { id: "item_3", description: "Creative Marketing Campaign Copywriting", quantity: 3, price: 1500 }
    ],
    notes: "Net 15 payment terms apply."
  },
  {
    id: "inv_3",
    invoiceNumber: "INV-2026-003",
    clientName: "Horizon Labs",
    clientEmail: "finance@horizonlabs.co",
    issueDate: formatDateString(fiveDaysAgo),
    dueDate: formatDateString(tomorrow),
    amount: 8500.00,
    status: "paid",
    items: [
      { id: "item_4", description: "NextJS 15 High-Performance Consulting", quantity: 5, price: 1700 }
    ],
    notes: "Thank you for partnering with Horizon Consulting group."
  },
  {
    id: "inv_4",
    invoiceNumber: "INV-2026-004",
    clientName: "Starlight Digital Ltd",
    clientEmail: "pay@starlight.digital",
    issueDate: formatDateString(fiveDaysAgo),
    dueDate: formatDateString(fiveDaysAgo),
    amount: 12000.00,
    status: "paid",
    items: [
      { id: "item_5", description: "Full-Stack Web App Development (Milestone 2)", quantity: 1, price: 12000 }
    ]
  },
  {
    id: "inv_5",
    invoiceNumber: "INV-2026-005",
    clientName: "Pinnacle Group",
    clientEmail: "pinnacle.invoicing@pinnaclegroup.org",
    issueDate: formatDateString(todayDate),
    dueDate: formatDateString(tomorrow),
    amount: 1540.00,
    status: "draft",
    items: [
      { id: "item_6", description: "Technical Writing and Manual Generation", quantity: 14, price: 110 }
    ]
  }
];

// OVERDUE PROCESSOR
// Automatically flag invoices as 'overdue' if the 'dueDate' has passed and the status is still 'pending'
export function processOverdueInvoices(invoices: Invoice[]): { updatedInvoices: Invoice[]; flaggedInvoices: string[] } {
  // Get current date formatted in user's timezone context
  const todayStr = formatDateString(new Date());
  const todayTime = new Date(todayStr).getTime();
  
  const flaggedInvoices: string[] = [];
  
  const updatedInvoices = invoices.map((invoice) => {
    if (invoice.status === "pending") {
      const dueTime = new Date(invoice.dueDate).getTime();
      
      if (dueTime < todayTime) {
        flaggedInvoices.push(invoice.invoiceNumber);
        return {
          ...invoice,
          status: "overdue" as InvoiceStatus,
        };
      }
    }
    return invoice;
  });
  
  return { updatedInvoices, flaggedInvoices };
}

// Stats calculator
export function calculateDashboardStats(invoices: Invoice[]) {
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  invoices.forEach((inv) => {
    const amt = inv.amount;
    if (inv.status === "paid") {
      totalPaid += amt;
      totalRevenue += amt;
    } else if (inv.status === "pending") {
      totalPending += amt;
    } else if (inv.status === "overdue") {
      totalOverdue += amt;
    }
  });

  return {
    totalRevenue,
    totalPaid,
    totalPending,
    totalOverdue,
    invoiceCount: invoices.length,
  };
}
