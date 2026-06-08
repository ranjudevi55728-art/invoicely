'use client';

import React, { use } from 'react';
import InvoiceForm from '@/components/InvoiceForm';
import Sidebar from '@/components/Sidebar';
import { WithAuth } from '@/components/WithAuth';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditInvoicePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  return (
    <WithAuth>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pl-18 sm:pl-4 md:pl-8">
          <InvoiceForm invoiceIdToEdit={id} />
        </main>
      </div>
    </WithAuth>
  );
}
