import React, { useEffect, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { 
  Building2, User, FileText, ShoppingBag, DollarSign,
  Plus, Trash2, Copy, ToggleLeft, ToggleRight,
  Sparkles, Lock, Phone, Mail, Globe, Search
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { PRODUCT_CATALOG, CatalogProduct, InvoiceData, CustomerDetails } from '../types/invoice';
import { COMPANY } from '../constants/company';

interface InvoiceFormProps {
  isIgst: boolean;
  setIsIgst: (val: boolean) => void;
  onShowHistory: () => void;
  customers: CustomerDetails[];
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ isIgst, setIsIgst, onShowHistory, customers }) => {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<InvoiceData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchData = watch();
  const watchItems = watchData.items || [];
  const watchBillingAddress = watchData.customer?.billingAddress;
  const watchCouponDiscount = watchData.summary?.couponDiscount || 0;
  const watchShippingCharges = watchData.summary?.shippingCharges || 0;
  const watchAmountPaid = watchData.summary?.amountPaid || 0;

  // Track product-specific catalog details (flavors and sizes) for each row
  const [rowCatalogMetadata, setRowCatalogMetadata] = useState<Record<number, CatalogProduct>>({});

  // Copy Billing Address to Shipping Address
  const [sameAddress, setSameAddress] = useState(false);

  useEffect(() => {
    if (sameAddress && watchBillingAddress) {
      setValue('customer.shippingAddress', watchBillingAddress, { shouldValidate: true });
    }
  }, [watchBillingAddress, sameAddress, setValue]);

  // Auto-fill row details when a product is selected
  const handleProductSelect = (index: number, product: CatalogProduct) => {
    setValue(`items.${index}.name`, product.name, { shouldValidate: true, shouldDirty: true });
    setValue(`items.${index}.unitPrice`, product.defaultPrice, { shouldValidate: true, shouldDirty: true });
    setValue(`items.${index}.gstPercent`, 0, { shouldValidate: true, shouldDirty: true });
    setValue(`items.${index}.qty`, 1, { shouldValidate: true, shouldDirty: true });
    setValue(`items.${index}.discount`, 0, { shouldValidate: true, shouldDirty: true });
    
    // Set default flavor and size if available
    if (product.flavors.length > 0) {
      setValue(`items.${index}.variant`, product.flavors[0], { shouldValidate: true, shouldDirty: true });
    } else {
      setValue(`items.${index}.variant`, 'Unflavored', { shouldValidate: true, shouldDirty: true });
    }
    
    if (product.sizes.length > 0) {
      setValue(`items.${index}.size`, product.sizes[0], { shouldValidate: true, shouldDirty: true });
    } else {
      setValue(`items.${index}.size`, 'Standard', { shouldValidate: true, shouldDirty: true });
    }

    setRowCatalogMetadata(prev => ({
      ...prev,
      [index]: product
    }));
  };

  // Auto-calculate row totals and summary items
  useEffect(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;

    watchItems.forEach((item, index) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.unitPrice) || 0;
      const discountPercent = Number(item.discount) || 0;
      const gstPercent = Number(item.gstPercent) || 0;

      const itemSubtotal = qty * price;
      const discountAmount = itemSubtotal * (discountPercent / 100);
      const taxableValue = Math.max(0, itemSubtotal - discountAmount);
      const itemGst = taxableValue * (gstPercent / 100);
      const rowTotal = taxableValue + itemGst;

      // Update row total in form state silently if it changed
      if (item.total !== rowTotal) {
        setValue(`items.${index}.total`, Number(rowTotal.toFixed(2)));
      }

      subtotal += itemSubtotal;
      totalDiscount += discountAmount;
      totalGst += itemGst;
    });

    const summarySubtotal = Math.max(0, subtotal - totalDiscount);
    const couponDiscountAmount = summarySubtotal * ((Number(watchCouponDiscount) || 0) / 100);
    const taxableAfterCoupon = Math.max(0, summarySubtotal - couponDiscountAmount);
    
    // Recalculate taxes based on taxable value after coupon discount
    // For simplicity, we distribute coupon discount proportionally to compute exact CGST/SGST/IGST
    const couponRatio = summarySubtotal > 0 ? taxableAfterCoupon / summarySubtotal : 0;
    const adjustedGst = totalGst * couponRatio;

    const cgst = isIgst ? 0 : adjustedGst / 2;
    const sgst = isIgst ? 0 : adjustedGst / 2;
    const igst = isIgst ? adjustedGst : 0;

    const rawGrandTotal = taxableAfterCoupon + adjustedGst + Number(watchShippingCharges);
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOff = roundedGrandTotal - rawGrandTotal;
    const balanceDue = roundedGrandTotal - Number(watchAmountPaid);

    setValue('summary.subtotal', Number(subtotal.toFixed(2)));
    setValue('summary.discount', Number(totalDiscount.toFixed(2)));
    setValue('summary.cgst', Number(cgst.toFixed(2)));
    setValue('summary.sgst', Number(sgst.toFixed(2)));
    setValue('summary.igst', Number(igst.toFixed(2)));
    setValue('summary.roundOff', Number(roundOff.toFixed(2)));
    setValue('summary.grandTotal', roundedGrandTotal);
    setValue('summary.balanceDue', Number(balanceDue.toFixed(2)));
  }, [
    watchData,
    isIgst, 
    setValue
  ]);

  // Append a blank item if catalog is empty initially
  useEffect(() => {
    if (fields.length === 0) {
      append({ id: Math.random().toString(), name: '', variant: '', size: '', qty: 1, unitPrice: 0, discount: 0, gstPercent: 0, total: 0 });
    }
  }, [fields, append]);

  return (
    <div className="space-y-8 bg-transparent">
      {/* ---------------- SECTION 2: CUSTOMER DETAILS ---------------- */}
      <section className="py-6 relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-elmen-orange/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between border-b border-elmen-gray pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-elmen-orange/10 rounded-xl text-elmen-orange">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-elmen-text">Customer Details</h2>
              <p className="text-xs text-elmen-muted">Billing and shipping parameters</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="glass-label">Customer Name</label>
            <input 
              type="text" 
              {...register('customer.name', {
                onChange: (e) => {
                  const enteredVal = e.target.value;
                  const matchedCustomer = customers.find(
                    c => c.name.toLowerCase().trim() === enteredVal.toLowerCase().trim()
                  );
                  if (matchedCustomer) {
                    setValue('customer.phone', matchedCustomer.phone || '', { shouldValidate: true, shouldDirty: true });
                    setValue('customer.email', matchedCustomer.email || '', { shouldValidate: true, shouldDirty: true });
                    setValue('customer.billingAddress', matchedCustomer.billingAddress || '', { shouldValidate: true, shouldDirty: true });
                    setValue('customer.shippingAddress', matchedCustomer.shippingAddress || '', { shouldValidate: true, shouldDirty: true });
                    if (matchedCustomer.gstin) {
                      setValue('customer.gstin', matchedCustomer.gstin, { shouldValidate: true, shouldDirty: true });
                    }
                  }
                }
              })} 
              list="customer-suggestions"
              className="glass-input w-full" 
              placeholder="e.g. Rohan Sharma"
            />
            <datalist id="customer-suggestions">
              {customers.map((c, i) => (
                <option key={i} value={c.name} />
              ))}
            </datalist>
            {errors.customer?.name && <span className="text-xs text-red-500 mt-1">{errors.customer.name.message}</span>}
          </div>

          <div>
            <label className="glass-label">Phone Number</label>
            <input 
              type="text" 
              {...register('customer.phone')} 
              className="glass-input w-full" 
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          <div className="md:col-span-2">
            <label className="glass-label">Email Address</label>
            <input 
              type="email" 
              {...register('customer.email')} 
              className="glass-input w-full" 
              placeholder="e.g. rohan@gmail.com"
            />
          </div>

          <div>
            <label className="glass-label">Billing Address</label>
            <textarea 
              {...register('customer.billingAddress')} 
              rows={3}
              className="glass-input w-full resize-none" 
              placeholder="Enter customer billing address"
            />
            {errors.customer?.billingAddress && <span className="text-xs text-red-500 mt-1">{errors.customer.billingAddress.message}</span>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="glass-label mb-0">Shipping Address</label>
              <label className="inline-flex items-center gap-1.5 text-xs text-elmen-muted font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAddress}
                  onChange={(e) => setSameAddress(e.target.checked)}
                  className="rounded border-elmen-gray text-elmen-orange focus:ring-elmen-orange w-3.5 h-3.5"
                />
                Same as Billing Address
              </label>
            </div>
            <textarea 
              {...register('customer.shippingAddress')} 
              rows={3}
              disabled={sameAddress}
              className={`glass-input w-full resize-none ${sameAddress ? 'opacity-60 cursor-not-allowed bg-elmen-dark' : ''}`} 
              placeholder={sameAddress ? "Matches billing address" : "Enter customer shipping address"}
            />
            {errors.customer?.shippingAddress && <span className="text-xs text-red-500 mt-1">{errors.customer.shippingAddress.message}</span>}
          </div>
        </div>
      </section>

      {/* ---------------- SECTION 3: INVOICE DETAILS ---------------- */}
      <section className="py-6 relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-elmen-orange/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between border-b border-elmen-gray pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-elmen-orange/10 rounded-xl text-elmen-orange">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-elmen-text">Invoice Details</h2>
              <p className="text-xs text-elmen-muted">Invoice reference dates and methods</p>
            </div>
          </div>
          {/* IGST Transaction Toggle */}
          <div className="flex items-center gap-2 bg-elmen-dark px-3 py-1.5 rounded-xl border border-elmen-gray">
            <span className="text-xs text-elmen-muted font-medium">Inter-state (IGST)</span>
            <button
              type="button"
              onClick={() => setIsIgst(!isIgst)}
              className="text-elmen-orange focus:outline-none transition-colors"
            >
              {isIgst ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-elmen-gray" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="glass-label">Invoice Number</label>
            <input 
              type="text" 
              {...register('invoice.invoiceNo')} 
              readOnly
              className="glass-input w-full font-mono text-sm opacity-80 bg-elmen-dark cursor-not-allowed" 
              placeholder="EL-INV-000001"
            />
            {errors.invoice?.invoiceNo && <span className="text-xs text-red-500 mt-1">{errors.invoice.invoiceNo.message}</span>}
          </div>

          <div>
            <label className="glass-label">Order Number</label>
            <input 
              type="text" 
              {...register('invoice.orderNo')} 
              className="glass-input w-full font-mono text-sm" 
              placeholder="ORD-100259"
            />
          </div>

          <div>
            <label className="glass-label">Invoice Date</label>
            <input 
              type="date" 
              {...register('invoice.invoiceDate')} 
              className="glass-input w-full text-sm" 
            />
          </div>

          <div>
            <label className="glass-label">Due Date</label>
            <input 
              type="date" 
              {...register('invoice.dueDate')} 
              className="glass-input w-full text-sm" 
            />
          </div>

          <div>
            <label className="glass-label">Payment Method</label>
            <select 
              {...register('invoice.paymentMethod')} 
              className="glass-input w-full text-sm appearance-none bg-no-repeat"
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
              <option value="UPI" className="bg-elmen-charcoal">UPI</option>
              <option value="Cash" className="bg-elmen-charcoal">Cash</option>
              <option value="Card" className="bg-elmen-charcoal">Card</option>
              <option value="Net Banking" className="bg-elmen-charcoal">Net Banking</option>
              <option value="COD" className="bg-elmen-charcoal">COD</option>
            </select>
          </div>

          <div>
            <label className="glass-label">Payment Status</label>
            <select 
              {...register('invoice.paymentStatus')} 
              className="glass-input w-full text-sm appearance-none bg-no-repeat"
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
              <option value="Paid" className="bg-elmen-charcoal text-green-400">Paid</option>
              <option value="Pending" className="bg-elmen-charcoal text-orange-400">Pending</option>
              <option value="Partial" className="bg-elmen-charcoal text-yellow-400">Partial</option>
            </select>
          </div>
        </div>
      </section>

      {/* ---------------- SECTION 4: PRODUCTS ---------------- */}
      <section className="py-6 relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-elmen-orange/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between border-b border-elmen-gray pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-elmen-orange/10 rounded-xl text-elmen-orange">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-elmen-text">Line Items</h2>
              <p className="text-xs text-elmen-muted">Manage products, pricing, discounts and taxes</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => append({ id: Math.random().toString(), name: '', variant: '', size: '', qty: 1, unitPrice: 0, discount: 0, gstPercent: 0, total: 0 })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-elmen-orange/10 hover:bg-elmen-orange/20 text-elmen-orange rounded-xl text-xs font-semibold border border-elmen-orange/20 transition-all duration-200"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>

        {/* Dynamic Product Rows Container */}
        <div className="space-y-6">
          {fields.map((field, index) => {
            const currentItem = watchItems[index];
            const currentMetadata = rowCatalogMetadata[index];

            // Resolve size/variant dropdown choices based on catalog metadata or empty defaults
            const availableSizes = currentMetadata ? currentMetadata.sizes : [];
            const availableFlavors = currentMetadata ? currentMetadata.flavors : [];

            const qty = Number(currentItem?.qty) || 0;
            const price = Number(currentItem?.unitPrice) || 0;
            const discountPercent = Number(currentItem?.discount) || 0;
            const gstPercent = Number(currentItem?.gstPercent) || 0;

            const itemSubtotal = qty * price;
            const discountAmount = itemSubtotal * (discountPercent / 100);
            const taxableValue = Math.max(0, itemSubtotal - discountAmount);
            const gstAmount = taxableValue * (gstPercent / 100);

            return (
              <div 
                key={field.id} 
                className="group relative py-5 border-b border-elmen-gray/50 last:border-0 transition-all duration-300 space-y-4"
              >
                {/* Header Row Index and Delete Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-elmen-muted bg-elmen-lightgray px-2 py-0.5 rounded">ITEM #{index + 1}</span>
                    {currentItem?.name && (
                      <span className="text-xs text-elmen-orange font-medium flex items-center gap-1">
                        <Sparkles size={11} /> Auto-calculated
                      </span>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <button
                       type="button"
                       onClick={() => remove(index)}
                       className="p-1.5 bg-red-50 hover:bg-red-500 text-red-400 hover:text-white rounded-lg border border-red-200 hover:border-red-500 transition-all duration-200"
                       title="Remove line item"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Product Autocomplete Dropdown */}
                  <div className="md:col-span-2">
                    <label className="glass-label">Product Name</label>
                    <SearchableSelect
                      options={PRODUCT_CATALOG}
                      value={currentItem?.name}
                      onSelect={(prod) => handleProductSelect(index, prod)}
                      placeholder="Search for Whey, Creatine, Multivitamins..."
                    />
                    <input type="hidden" {...register(`items.${index}.name` as const)} />
                    <input type="hidden" {...register(`items.${index}.total` as const, { valueAsNumber: true })} />
                    {errors.items?.[index]?.name && (
                      <span className="text-xs text-red-500 mt-1 block">{errors.items[index]?.name?.message}</span>
                    )}
                  </div>

                  {/* Flavor / Variant Dropdown */}
                  <div>
                    <label className="glass-label">Flavor / Variant</label>
                    {availableFlavors.length > 0 ? (
                      <select
                        {...register(`items.${index}.variant` as const)}
                        className="glass-input w-full text-sm appearance-none bg-no-repeat"
                        style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                      >
                        {availableFlavors.map(flavor => (
                          <option key={flavor} value={flavor} className="bg-elmen-charcoal">{flavor}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        {...register(`items.${index}.variant` as const)}
                        placeholder="e.g. Chocolate"
                        className="glass-input w-full text-sm"
                      />
                    )}
                  </div>

                  {/* Size Dropdown */}
                  <div>
                    <label className="glass-label">Size / Weight</label>
                    {availableSizes.length > 0 ? (
                      <select
                        {...register(`items.${index}.size` as const)}
                        className="glass-input w-full text-sm appearance-none bg-no-repeat"
                        style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                      >
                        {availableSizes.map(size => (
                          <option key={size} value={size} className="bg-elmen-charcoal">{size}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        {...register(`items.${index}.size` as const)}
                        placeholder="e.g. 2kg"
                        className="glass-input w-full text-sm"
                      />
                    )}
                  </div>

                  {/* Qty */}
                  <div>
                    <label className="glass-label">Qty</label>
                    <input
                      type="number"
                      min="1"
                      {...register(`items.${index}.qty` as const, { valueAsNumber: true })}
                      className="glass-input w-full text-sm font-semibold"
                      placeholder="1"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="glass-label">Unit Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                      className="glass-input w-full text-sm font-semibold"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="glass-label">Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register(`items.${index}.discount` as const, { valueAsNumber: true })}
                      className="glass-input w-full text-sm text-green-400 font-semibold"
                      placeholder="0.00"
                    />
                  </div>

                  {/* GST Checkbox — 5% or 0% */}
                  <div className="flex flex-col justify-end">
                    <label className="glass-label">GST</label>
                    <label
                      htmlFor={`gst-toggle-${index}`}
                      className={`flex items-center gap-2.5 cursor-pointer px-3 py-2.5 rounded-xl border transition-all duration-200 select-none ${
                        Number(currentItem?.gstPercent) === 5
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-elmen-lightgray border-elmen-gray text-elmen-muted'
                      }`}
                    >
                      {/* Hidden native checkbox wired to react-hook-form */}
                      <input
                        id={`gst-toggle-${index}`}
                        type="checkbox"
                        className="sr-only"
                        checked={Number(currentItem?.gstPercent) === 5}
                        onChange={(e) =>
                          setValue(`items.${index}.gstPercent`, e.target.checked ? 5 : 0, { shouldValidate: true })
                        }
                      />
                      {/* Custom checkbox box */}
                      <span
                        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                          Number(currentItem?.gstPercent) === 5
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'bg-white border-elmen-gray'
                        }`}
                      >
                        {Number(currentItem?.gstPercent) === 5 && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="text-xs font-semibold leading-tight">
                        {Number(currentItem?.gstPercent) === 5 ? '5% GST Applied' : 'No GST'}
                      </span>
                    </label>
                    {/* Hidden field to keep gstPercent in RHF state */}
                    <input type="hidden" {...register(`items.${index}.gstPercent` as const, { valueAsNumber: true })} />
                  </div>
                </div>

                {/* Sub-row calculation values */}
                <div className="flex items-center justify-end gap-6 text-xs text-elmen-muted pt-3 border-t border-elmen-gray">
                  <div>
                    <span>Taxable: </span>
                    <span className="font-semibold text-elmen-text">
                      ₹{taxableValue.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span>GST (5%): </span>
                    <span className={`font-semibold ${ gstPercent === 5 ? 'text-emerald-600' : 'text-elmen-muted' }`}>
                      ₹{gstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span>Row Total: </span>
                    <span className="font-bold text-elmen-orange">
                      ₹{(Number(currentItem?.total) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- SECTION 5: SUMMARY SETTINGS ---------------- */}
      <section className="py-6 relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-elmen-orange/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between border-b border-elmen-gray pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-elmen-orange/10 rounded-xl text-elmen-orange">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide text-elmen-text">Order Summary Settings</h2>
              <p className="text-xs text-elmen-muted">Configure global discounts, shipping, and cash updates</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-elmen-dark px-4 py-2 rounded-xl border border-elmen-gray text-xs">
            <span className="text-elmen-muted font-medium">Total Items: <strong className="text-elmen-text">{watchItems.filter(i => i.name).length}</strong></span>
            <span className="text-elmen-gray">|</span>
            <span className="text-elmen-muted font-medium">Total Qty: <strong className="text-elmen-text">{watchItems.filter(i => i.name).reduce((acc, item) => acc + (Number(item.qty) || 0), 0)}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="glass-label">Coupon Discount (%)</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              max="100"
              {...register('summary.couponDiscount', { valueAsNumber: true })} 
              className="glass-input w-full text-green-400 font-semibold" 
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="glass-label">Shipping Charges (₹)</label>
            <input 
              type="number" 
              step="0.01;0.1;1"
              min="0"
              {...register('summary.shippingCharges', { valueAsNumber: true })} 
              className="glass-input w-full font-semibold" 
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="glass-label">Amount Paid (₹)</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              {...register('summary.amountPaid', { valueAsNumber: true })} 
              className="glass-input w-full text-elmen-orange font-semibold" 
              placeholder="0.00"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
