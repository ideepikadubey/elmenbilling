/**
 * invoiceDB.ts
 * API Client wrapper for ELMEN Billing — communicates with MongoDB backend using Axios
 * and handles sequential invoice number generation and synchronization.
 */

import axios from 'axios';
import { InvoiceData } from '../types/invoice';

const API_BASE = '/api/invoices';

export async function generateInvoiceNumber(): Promise<string> {
  const response = await axios.post<{ invoiceNo: string }>(`${API_BASE}/increment`);
  return response.data.invoiceNo;
}

export async function peekNextInvoiceNumber(): Promise<string> {
  const response = await axios.get<{ nextInvoiceNo: string }>(`${API_BASE}/next-number`);
  return response.data.nextInvoiceNo;
}

export async function saveInvoice(data: InvoiceData): Promise<void> {
  await axios.post(API_BASE, data);
}

export async function getAllInvoices(): Promise<InvoiceData[]> {
  const response = await axios.get<InvoiceData[]>(API_BASE);
  return response.data;
}

export async function getInvoiceByNo(invoiceNo: string): Promise<InvoiceData | undefined> {
  try {
    const response = await axios.get<InvoiceData>(`${API_BASE}/${invoiceNo}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function deleteInvoiceByNo(invoiceNo: string): Promise<void> {
  await axios.delete(`${API_BASE}/${invoiceNo}`);
}

export async function migrateFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem('elmen_saved_invoices');
  if (!raw) return;
  try {
    const invoices: InvoiceData[] = JSON.parse(raw);
    if (!Array.isArray(invoices) || invoices.length === 0) {
      localStorage.removeItem('elmen_saved_invoices');
      return;
    }
    for (const inv of invoices) {
      await saveInvoice(inv);
    }
    localStorage.removeItem('elmen_saved_invoices');
    console.info('[ElmenDB] Migrated', invoices.length, 'invoices from localStorage to MongoDB database.');
  } catch (err) {
    console.error('[ElmenDB] Migration failed:', err);
  }
}
