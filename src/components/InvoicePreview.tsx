import React from 'react';
import { InvoiceData } from '../types/invoice';
import { COMPANY, INVOICE_FOOTER_MESSAGE, TERMS_AND_CONDITIONS } from '../constants/company';
import elmenLogo from '../assets/elmen-logo-white.png';
import elmenQR from '../assets/elmenQR.jpeg';

interface InvoicePreviewProps {
  data: InvoiceData;
  isIgst: boolean;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, isIgst }) => {
  const { customer, invoice, items, summary, notes } = data;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);

  const getStatus = () => {
    const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.paymentStatus !== 'Paid';
    if (invoice.paymentStatus === 'Paid') return { label: 'PAID', color: '#16a34a' };
    if (isOverdue) return { label: 'OVERDUE', color: '#dc2626' };
    if (invoice.paymentStatus === 'Partial') return { label: 'PARTIAL', color: '#d97706' };
    return { label: 'PENDING', color: '#ea580c' };
  };

  const status = getStatus();

  return (
    <div
      id="invoice-printable"
      className="print-invoice-container"
      style={{
        width: '148mm',
        backgroundColor: '#ffffff',
        color: '#111111',
        fontFamily: "'Outfit', 'Inter', Arial, sans-serif",
        padding: '0',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        position: 'relative',
        boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Page 1 wrapper */}
      <div style={{ position: 'relative', height: '202mm', padding: '8mm 12mm 12mm 12mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        {/* Background Watermark */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '260px',
          height: 'auto',
          opacity: 0.10,
          pointerEvents: 'none',
          zIndex: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <img src={elmenLogo} alt="Watermark" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
        </div>

        {/* ── TOP BLUE ACCENT BAR ── */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #111111 0%, #2563EB 50%, #111111 100%)', borderRadius: '2px', marginBottom: '4mm' }} />

        {/* ── HEADER: LOGO + INVOICE TITLE ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4mm' }}>
          {/* Logo — BG WHITE PNG */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={elmenLogo}
              alt="Elmen Nutrition"
              style={{ height: '85px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* Invoice Title Block */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.5px', color: '#111111', lineHeight: 1 }}>
              TAX INVOICE
            </div>
            <div style={{ marginTop: '4px', fontSize: '11.5px', fontWeight: '850', color: status.color, letterSpacing: '1px' }}>
              STATUS: {status.label}
            </div>
            <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#111', fontWeight: '600' }}>
              <strong>Date:</strong> {invoice.invoiceDate}
            </div>
          </div>
        </div>

        {/* ── HORIZONTAL DETAILS ROW ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5mm', fontSize: '9px', color: '#555', marginBottom: '3mm', paddingBottom: '3mm', borderBottom: '1.5px solid #eee' }}>
          <div><strong style={{ color: '#111', fontWeight: '700' }}>Invoice #:</strong> {invoice.invoiceNo}</div>
          {invoice.orderNo && <div><strong style={{ color: '#111', fontWeight: '700' }}>Order #:</strong> {invoice.orderNo}</div>}
          <div><strong style={{ color: '#111', fontWeight: '700' }}>Due Date:</strong> {invoice.dueDate}</div>
          <div><strong style={{ color: '#111', fontWeight: '700' }}>Payment Method:</strong> {invoice.paymentMethod}</div>
        </div>

        {/* ── CUSTOMER ADDRESSES (Stacked vertically) ── */}
        <div style={{ marginBottom: '6mm', fontSize: '9.5px', maxWidth: '140mm' }}>
          {/* BILLED TO */}
          <div style={{ marginBottom: '4mm' }}>
            <div style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '1.5px', color: '#2563EB', textTransform: 'uppercase', marginBottom: '4px' }}>
              ▶ BILLED TO
            </div>
            <div style={{ fontWeight: '800', fontSize: '11px', color: '#111', marginBottom: '2px' }}>{customer.name || 'Walk-in Customer'}</div>
            <div style={{ color: '#444', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{customer.billingAddress}</div>
            {customer.phone && <div style={{ marginTop: '2px', color: '#333' }}>📞 {customer.phone}</div>}
            {customer.email && <div style={{ color: '#333' }}>✉ {customer.email}</div>}
          </div>

          {/* SHIPPED TO */}
          <div>
            <div style={{ fontSize: '8px', fontWeight: '800', letterSpacing: '1.5px', color: '#2563EB', textTransform: 'uppercase', marginBottom: '4px' }}>
              ▶ SHIPPED TO / SHIPPING ADDRESS
            </div>
            <div style={{ color: '#444', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
              {customer.shippingAddress || customer.billingAddress}
            </div>
          </div>
        </div>

        {/* ── GST DETAILS ROW ── */}
        <div style={{
          display: 'flex', gap: '8mm', padding: '5px 10px',
          background: '#f9f9f9', borderRadius: '6px', marginBottom: '6mm',
          fontSize: '8.5px', color: '#444', border: '1px solid #eee'
        }}>
          <span><strong style={{ color: '#111' }}>GSTIN:</strong> {COMPANY.gstin}</span>
          {COMPANY.fssai && <span><strong style={{ color: '#111' }}>FSSAI:</strong> {COMPANY.fssai}</span>}
          {customer.gstin && <span><strong style={{ color: '#111' }}>Customer GSTIN:</strong> {customer.gstin}</span>}
          <span style={{ marginLeft: 'auto' }}><strong style={{ color: '#111' }}>Tax Type:</strong> {isIgst ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)'}</span>
        </div>

        {/* ── PRODUCT TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '6mm' }}>
          <thead>
            <tr style={{ backgroundColor: '#111111', color: '#ffffff' }}>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: '700', letterSpacing: '0.5px' }}>#</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: '700' }}>PRODUCT DETAILS</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: '700' }}>QTY</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>UNIT PRICE</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>DISC.</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: '700' }}>GST</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const itemSubtotal = item.qty * item.unitPrice;
              const discountAmt = itemSubtotal * (item.discount / 100);
              const taxable = Math.max(0, itemSubtotal - discountAmt);
              const gstAmt = taxable * (item.gstPercent / 100);
              return (
                <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 8px', color: '#999', fontFamily: 'monospace' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 8px' }}>
                    <div style={{ fontWeight: '700', color: '#111', fontSize: '9.5px' }}>{item.name || '—'}</div>
                    <div style={{ color: '#888', fontSize: '8px', marginTop: '2px' }}>
                      {item.variant && `Flavor: ${item.variant}`}{item.variant && item.size ? '  |  ' : ''}{item.size && `Size: ${item.size}`}
                    </div>
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: '700' }}>{item.qty}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.unitPrice)}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#16a34a', whiteSpace: 'nowrap' }}>
                    {item.discount > 0 ? `-${fmt(discountAmt)} (${item.discount}%)` : '—'}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', color: '#555' }}>
                    {item.gstPercent}%
                    <div style={{ fontSize: '7.5px', color: '#888' }}>{fmt(gstAmt)}</div>
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '800', color: '#111' }}>{fmt(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Page 1 Bottom: Totals & QR Code ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '8mm', marginTop: 'auto', marginBottom: '4mm' }}>
          {/* Left Side: QR Code + Pay Info */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '3mm' }}>
            {/* Total Items & Qty Block */}
            <div style={{ display: 'flex', gap: '15px', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '9px', color: '#444' }}>
              <span><strong>Total Items:</strong> {items.filter(i => i.name).length}</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span><strong>Total Qty:</strong> {items.filter(i => i.name).reduce((acc, item) => acc + (Number(item.qty) || 0), 0)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <img src={elmenQR} alt="UPI QR Code" style={{ width: '56px', height: '56px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px', background: '#fff', flexShrink: 0, objectFit: 'contain' }} />
              <div>
                <div style={{ fontWeight: '800', color: '#111', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scan to Pay (UPI)</div>
                <div style={{ color: '#555', fontSize: '7.5px', marginTop: '2px', lineHeight: '1.3' }}>Pay instantly via any UPI app. Scan this code to initiate transfer.</div>
              </div>
            </div>

            <div style={{ fontSize: '8px', color: '#555', fontStyle: 'italic', padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              {INVOICE_FOOTER_MESSAGE}
            </div>
          </div>

          {/* Right Side: Totals Card */}
          <div style={{ backgroundColor: '#f9f9f9', borderRadius: '8px', padding: '10px 12px', border: '1px solid #eee', fontSize: '9px' }}>
            {[
              { label: 'Subtotal', value: fmt(summary.subtotal), bold: false },
              summary.discount > 0 ? { label: 'Item Discount', value: `-${fmt(summary.discount)}`, bold: false, green: true } : null,
              summary.couponDiscount > 0 ? { label: `Coupon Discount (${summary.couponDiscount}%)`, value: `-${fmt((summary.subtotal - summary.discount) * (summary.couponDiscount / 100))}`, bold: false, green: true } : null,
              isIgst
                ? (summary.igst > 0 ? { label: 'IGST', value: fmt(summary.igst), bold: false } : null)
                : null,
              !isIgst && summary.cgst > 0 ? { label: 'CGST', value: fmt(summary.cgst), bold: false } : null,
              !isIgst && summary.sgst > 0 ? { label: 'SGST', value: fmt(summary.sgst), bold: false } : null,
              summary.shippingCharges > 0 ? { label: 'Shipping', value: `+${fmt(summary.shippingCharges)}`, bold: false } : null,
              Math.abs(summary.roundOff) > 0.001 ? { label: 'Round Off', value: fmt(summary.roundOff), bold: false } : null,
            ].filter(Boolean).map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #eee', color: (row as any).green ? '#16a34a' : '#444' }}>
                <span>{(row as any).label}</span>
                <span style={{ fontFamily: 'monospace' }}>{(row as any).value}</span>
              </div>
            ))}

            {/* Grand Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0 4px', marginTop: '4px',
              borderTop: '2px solid #111', fontWeight: '900',
              fontSize: '12px', color: '#111'
            }}>
              <span>Grand Total</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(summary.grandTotal)}</span>
            </div>

            {/* Amount Paid + Balance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#555', fontSize: '8.5px' }}>
              <span>Amount Paid</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(summary.amountPaid)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '4px 6px',
              backgroundColor: summary.balanceDue <= 0 ? '#dcfce7' : '#fff7ed',
              borderRadius: '4px', marginTop: '4px', fontWeight: '800', fontSize: '10px',
              color: summary.balanceDue <= 0 ? '#16a34a' : '#ea580c',
            }}>
              <span>Balance Due</span>
              <span style={{ fontFamily: 'monospace' }}>{fmt(summary.balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Tagline + Website bottom line */}
        <div style={{ marginTop: '4mm', borderTop: '1px solid #eee', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', color: '#555' }}>
          <div>
            <span style={{ fontWeight: '950', fontSize: '10px', color: '#111', letterSpacing: '0.5px' }}>FUEL YOUR POTENTIAL.</span>
            <span style={{ marginLeft: '4mm' }}>{COMPANY.website}</span>
          </div>
          <div>This is a computer-generated invoice. No signature required.</div>
        </div>

        {/* ── BOTTOM BLUE ACCENT BAR ── */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #fff823ff 0%, #111111 50%, #fff823ff 100%)', borderRadius: '2px', marginTop: '4mm' }} />
      </div>

      {/* ── Page 2: Terms and Conditions (Separate Page) ── */}
      <div style={{ pageBreakBefore: 'always', position: 'relative', height: '202mm', padding: '8mm 12mm 12mm 12mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        {/* Background Watermark */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '260px',
          height: 'auto',
          opacity: 0.10,
          pointerEvents: 'none',
          zIndex: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <img src={elmenLogo} alt="Watermark" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Header decoration */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #fff823ff', paddingBottom: '3mm', marginBottom: '6mm', zIndex: 1 }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: '#111', letterSpacing: '0.5px' }}>TERMS, POLICIES &amp; COMPLIANCE</span>
          <span style={{ fontSize: '8px', color: '#888' }}>Invoice Reference: {invoice.invoiceNo}</span>
        </div>

        <div style={{ fontSize: '8px', color: '#444', lineHeight: '1.65', flex: 1 }}>
          {notes.notes && (
            <div style={{ marginBottom: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: '800', color: '#111', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Invoice Notes</div>
              <div style={{ fontSize: '8px', color: '#444' }}>{notes.notes}</div>
            </div>
          )}

          {/* Always-present T&C from constants */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: '800', color: '#111', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Terms &amp; Conditions</div>
            <ol style={{ margin: 0, padding: '0 0 0 16px', color: '#444', lineHeight: '1.65' }}>
              {TERMS_AND_CONDITIONS
                .split(/\n\n/)
                .filter(Boolean)
                .map((term, i) => (
                  <li key={i} style={{ marginBottom: '3px', fontSize: '7.5px' }}>
                    {term.replace(/^\d+\.\s*/, '')}
                  </li>
                ))
              }
            </ol>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginTop: '6mm' }}>
            {notes.returnPolicy && (
              <div style={{ background: '#fafafa', padding: '8px 10px', borderRadius: '6px', border: '1px solid #eee' }}>
                <div style={{ fontWeight: '800', color: '#111', fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Return Policy</div>
                <div style={{ fontSize: '7.5px' }}>{notes.returnPolicy}</div>
              </div>
            )}
            {notes.specialInstructions && (
              <div style={{ background: '#fafafa', padding: '8px 10px', borderRadius: '6px', border: '1px solid #eee' }}>
                <div style={{ fontWeight: '800', color: '#111', fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Special Instructions</div>
                <div style={{ fontSize: '7.5px' }}>{notes.specialInstructions}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Brand Info on Second Page */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '6mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7.5px', color: '#888' }}>
          <div>
            <div style={{ fontWeight: '800', color: '#111', fontSize: '9px' }}>{COMPANY.name}</div>
            <div>{COMPANY.email} | {COMPANY.phone}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>GSTIN: {COMPANY.gstin}</div>
            {COMPANY.fssai && <div>FSSAI: {COMPANY.fssai}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
