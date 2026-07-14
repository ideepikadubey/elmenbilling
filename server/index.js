const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Schema for Invoice Counter (for unique sequential numbers)
const CounterSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

// Schema for Invoices
const InvoiceSchema = new mongoose.Schema({
  company: {
    name: String,
    gstin: String,
    fssai: String,
    email: String,
    phone: String,
    website: String,
    address: String
  },
  customer: {
    name: String,
    phone: String,
    email: String,
    billingAddress: String,
    shippingAddress: String,
    gstin: String
  },
  invoice: {
    invoiceNo: { type: String, unique: true },
    orderNo: String,
    invoiceDate: String,
    dueDate: String,
    paymentMethod: String,
    paymentStatus: String
  },
  items: [
    {
      id: String,
      name: String,
      variant: String,
      size: String,
      qty: Number,
      unitPrice: Number,
      discount: Number,
      gstPercent: Number,
      total: Number
    }
  ],
  summary: {
    subtotal: Number,
    discount: Number,
    couponDiscount: Number,
    shippingCharges: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    roundOff: Number,
    grandTotal: Number,
    amountPaid: Number,
    balanceDue: Number
  },
  notes: {
    notes: String,
    terms: String,
    returnPolicy: String,
    specialInstructions: String
  }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', InvoiceSchema);

// Get next sequential invoice number (without incrementing)
app.get('/api/invoices/next-number', async (req, res) => {
  try {
    const counter = await Counter.findOne({ id: 'invoiceNo' });
    const nextSeq = (counter ? counter.seq : 0) + 1;
    const formattedNo = `EL-INV-${String(nextSeq).padStart(6, '0')}`;
    res.json({ nextInvoiceNo: formattedNo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment the sequence atomically and return the new invoice number
app.post('/api/invoices/increment', async (req, res) => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { id: 'invoiceNo' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const formattedNo = `EL-INV-${String(counter.seq).padStart(6, '0')}`;
    res.json({ invoiceNo: formattedNo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save or Update an invoice (Upsert based on invoice.invoiceNo)
app.post('/api/invoices', async (req, res) => {
  try {
    const invoiceData = req.body;
    const invoiceNo = invoiceData.invoice?.invoiceNo;

    if (!invoiceNo) {
      return res.status(400).json({ error: 'Invoice number is required in invoice.invoiceNo' });
    }

    const invoice = await Invoice.findOneAndUpdate(
      { 'invoice.invoiceNo': invoiceNo },
      invoiceData,
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: 'Invoice saved successfully!',
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all invoices (newest first)
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single invoice by number
app.get('/api/invoices/:invoiceNo', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ 'invoice.invoiceNo': req.params.invoiceNo });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an invoice
app.delete('/api/invoices/:invoiceNo', async (req, res) => {
  try {
    const result = await Invoice.findOneAndDelete({ 'invoice.invoiceNo': req.params.invoiceNo });
    if (!result) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: `Invoice ${req.params.invoiceNo} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Nodemailer Config & Send Email Endpoint
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

app.post('/api/invoices/send-email', async (req, res) => {
  const { to, invoiceData } = req.body;
  if (!to || !invoiceData) {
    return res.status(400).json({ error: 'Recipient email (to) and invoiceData are required.' });
  }

  const { customer, invoice, items, summary } = invoiceData;

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  const itemsHtml = items.map((item, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        <strong style="color: #111;">${item.name}</strong><br/>
        <span style="font-size: 11px; color: #777;">${item.variant || ''} ${item.size || ''}</span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${item.qty}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-family: monospace;">${fmt(item.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold;">${fmt(item.total)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">ELMEN NUTRITION</h2>
          <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">FUEL YOUR POTENTIAL</p>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 12px; font-weight: 800; color: #2563eb; letter-spacing: 1px; text-transform: uppercase;">Tax Invoice</span>
        </div>
      </div>

      <div style="margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Invoice #</strong></td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: bold;">${invoice.invoiceNo}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Date</strong></td>
            <td style="padding: 4px 0; text-align: right;">${invoice.invoiceDate}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Billed To</strong></td>
            <td style="padding: 4px 0; text-align: right; font-weight: bold;">${customer.name || 'Walk-in Customer'}</td>
          </tr>
          ${customer.phone ? `
          <tr>
            <td style="padding: 4px 0; color: #64748b;"><strong>Phone</strong></td>
            <td style="padding: 4px 0; text-align: right;">${customer.phone}</td>
          </tr>` : ''}
        </table>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 10px 8px; text-align: left;">#</th>
            <th style="padding: 10px 8px; text-align: left;">Item Details</th>
            <th style="padding: 10px 8px; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; text-align: right;">Unit Price</th>
            <th style="padding: 10px 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="width: 280px; margin-left: auto; margin-bottom: 32px; font-size: 13px; line-height: 1.8;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Subtotal</td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace;">${fmt(summary.subtotal)}</td>
          </tr>
          ${summary.discount > 0 ? `
          <tr>
            <td style="padding: 4px 0; color: #16a34a;">Item Discount</td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace; color: #16a34a;">-${fmt(summary.discount)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Total GST</td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace;">${fmt((summary.cgst || 0) + (summary.sgst || 0) + (summary.igst || 0))}</td>
          </tr>
          <tr style="font-size: 15px; font-weight: bold; color: #0f172a; border-top: 2px solid #0f172a;">
            <td style="padding: 8px 0 4px;">Grand Total</td>
            <td style="padding: 8px 0 4px; text-align: right; font-family: monospace; color: #e11d48;">${fmt(summary.grandTotal)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; line-height: 1.5;">
        <p style="margin: 0; font-weight: 700; color: #0f172a;">Thank you for shopping with Elmen Nutrition!</p>
        <p style="margin: 4px 0 0;">This is a system-generated invoice. For any inquiries, write to us at <strong>elmenindia@gmail.com</strong>.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: `"Elmen Nutrition" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Tax Invoice ${invoice.invoiceNo} - Elmen Nutrition`,
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('SMTP Mail Error:', error);
    res.status(500).json({ error: 'Failed to send email. Verification issue.' });
  }
});

app.use(express.static(path.join(__dirname, '../dist')));
// The "catchall" handler: for any request that doesn't
// match one of the API routes above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
