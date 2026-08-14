export interface CompanyDetails {
  name: string;
  gstin: string;
  fssai: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  logo: string; // Base64 image
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  gstin?: string;
}

export interface InvoiceDetails {
  invoiceNo: string;
  orderNo: string;
  invoiceDate: string;
  dueDate?: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Net Banking' | 'COD';
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
}

export interface InvoiceItem {
  id: string;
  name: string;
  variant: string;
  size: string;
  qty: number;
  unitPrice: number;
  discount: number; // Absolute discount value
  gstPercent: number; // e.g. 18, 12, 5
  total: number;
}

export interface OrderSummary {
  subtotal: number;
  discount: number;
  couponDiscount: number;
  shippingCharges: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
}

export interface AdditionalNotes {
  notes: string;
  terms: string;
  returnPolicy: string;
  specialInstructions: string;
}

export interface InvoiceData {
  company: CompanyDetails;
  customer: CustomerDetails;
  invoice: InvoiceDetails;
  items: InvoiceItem[];
  summary: OrderSummary;
  notes: AdditionalNotes;
}

export interface CatalogProduct {
  id: string;
  name: string;
  defaultPrice: number;
  gstPercent: number;
  sizes: string[];
  flavors: string[];
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    id: 'prod-1',
    name: 'ELMEN Clean Whey Protein 2kg',
    defaultPrice: 6499,
    gstPercent: 0,
    sizes: ['2kg / 4.4 lbs (2000g)'],
    flavors: ['Chocolate', 'Kesar Badam', 'Cookie & Cream', 'Malai Kulfi', 'Vanilla', 'Unflavored']
  },
  {
    id: 'prod-2',
    name: 'ELMEN Pro Gain Advanced Muscle Growth',
    defaultPrice: 3899,
    gstPercent: 0,
    sizes: ['3kg / 6.6 lbs (3000g)'],
    flavors: ['Chocolate', 'Kesar Badam', 'Cookie & Cream', 'Malai Kulfi', 'Unflavored']
  },
  {
    id: 'prod-3',
    name: 'ELMEN Hunter Pre-Workout',
    defaultPrice: 1949,
    gstPercent: 0,
    sizes: ['180g (30 Servings)'],
    flavors: ['Fruit Punch', 'Watermelon', 'Blue Raspberry']
  },
  {
    id: 'prod-4',
    name: 'ELMEN Wingman Pre-Workout',
    defaultPrice: 2399,
    gstPercent: 0,
    sizes: ['180g (18 Servings)'],
    flavors: ['Fruit Punch', 'Mango', 'Blue Raspberry']
  },
  {
    id: 'prod-5',
    name: 'ELMEN Micronized Creatine Monohydrate',
    defaultPrice: 1599,
    gstPercent: 0,
    sizes: ['240g (80 Servings)'],
    flavors: ['Unflavored']
  },
  {
    id: 'prod-6',
    name: 'ELMEN L-Carnitine 4000mg',
    defaultPrice: 2999,
    gstPercent: 0,
    sizes: ['450ml'],
    flavors: ['Mix Fruit Punch']
  },
  {
    id: 'prod-7',
    name: 'ELMEN Complete A to Z Multi-One Tablets',
    defaultPrice: 999,
    gstPercent: 0,
    sizes: ['60 Tablets'],
    flavors: ['Unflavored']
  },
  {
    id: 'prod-8',
    name: 'ELMEN Testo One Natural Herbs',
    defaultPrice: 2249,
    gstPercent: 0,
    sizes: ['60 Tablets'],
    flavors: ['Unflavored']
  },
  {
    id: 'prod-9',
    name: 'ELMEN 3X Strength Gold Omega-3',
    defaultPrice: 1299,
    gstPercent: 0,
    sizes: ['60 Softgels'],
    flavors: ['Unflavored']
  },
  {
    id: 'prod-10',
    name: 'ELMEN Stainless Steel Shaker',
    defaultPrice: 399,
    gstPercent: 0,
    sizes: ['Standard'],
    flavors: ['NA']
  },
  {
    id: 'prod-11', 
    name: 'ELMEN Plastic Shaker',
    defaultPrice: 149,
    gstPercent: 0,
    sizes: ['Standard'],
    flavors: ['NA']
  },
  {
    id: 'prod-12',
    name: 'ELMEN Towel',
    defaultPrice: 500,
    gstPercent: 0,
    sizes: ['Medium'],
    flavors: ['NA']
  },
  {
    id: 'prod-13',
    name: 'ELMEN Isolate Whey Protein 1kg',
    defaultPrice: 6999,
    gstPercent: 0,
    sizes: ['1kg / 2.2 lbs (1000g)'],
    flavors: ['Chocolate', 'Kesar Badam', 'Cookie & Cream', 'Malai Kulfi', 'Vanilla', 'Unflavored']
  },
  {
    id: 'prod-14',
    name: 'ELMEN Clean Whey Protein 1kg',
    defaultPrice: 4499,
    gstPercent: 0,
    sizes: ['1kg / 2.2 lbs (1000g)'],
    flavors: ['Chocolate', 'Kesar Badam', 'Cookie & Cream', 'Malai Kulfi', 'Vanilla', 'Unflavored']
  }
];
