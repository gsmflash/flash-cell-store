export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductStock {
  id: string;
  productId: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  updatedAt: string;
}

export interface Product {
  id: string;
  brandId: string | null;
  categoryId: string | null;
  warrantyPolicyId: string | null;
  name: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  shortDescription: string | null;
  costPrice: number | null;
  sellPrice: number;
  salePrice: number | null;
  weight: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  isActive: boolean;
  isFeatured: boolean;
  isService: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  stock: ProductStock | null;
  brand: Brand | null;
  category: Category | null;
  warrantyPolicy: WarrantyPolicy | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiOk<T> {
  status: 'ok';
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  status: 'error';
  message: string;
  code?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthMe {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile: {
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
    document: string | null;
  } | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  isActive: boolean;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  addedAt: string;
}

export interface Cart {
  cartId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface Address {
  id: string;
  customerId: string;
  label: string | null;
  type: 'residential' | 'commercial' | 'other';
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  number: string;
  customerId: string;
  addressId: string | null;
  couponId: string | null;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  total: number;
  notes: string | null;
  trackingCode: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
}

export interface DashboardStats {
  totalSales: number;
  ordersCount: number;
  ordersByStatus: Record<string, number>;
  lowStockCount: number;
  openServiceOrdersCount: number;
  serviceOrdersByStatus: Record<string, number>;
  customersCount: number;
  activeProductsCount: number;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  updatedAt: string;
}

export type StockMovementType = 'in' | 'out' | 'adjustment' | 'return' | 'loss';

export interface StockMovement {
  id: string;
  productId: string;
  supplierId: string | null;
  userId: string;
  type: StockMovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  unitCost: number | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export type ServiceOrderStatus =
  | 'received'
  | 'diagnosing'
  | 'waiting_parts'
  | 'waiting_approval'
  | 'approved'
  | 'in_progress'
  | 'done'
  | 'delivered'
  | 'cancelled';

export interface ServiceOrderHistoryEntry {
  id: string;
  serviceOrderId: string;
  userId: string | null;
  userName: string | null;
  previousStatus: ServiceOrderStatus | null;
  newStatus: ServiceOrderStatus | null;
  notes: string | null;
  createdAt: string;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto' | 'cash' | 'transfer' | 'installment' | 'other';
export type DiscountType = 'fixed' | 'percentage';
export type ReceivableStatus = 'pending' | 'partial' | 'paid';

export interface ServiceOrder {
  id: string;
  number: string;
  customerId: string;
  technicianId: string | null;
  status: ServiceOrderStatus;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  estimatedValue: number | null;
  subtotalValue: number | null;
  discount: number | null;
  discountType: DiscountType | null;
  finalValue: number | null;
  financialStatus: ReceivableStatus | null;
  financialNotes: string | null;
  customerComplaint: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  serviceOrderId: string;
  amount: number;
  method: PaymentMethod;
  changeAmount: number | null;
  paidAt: string;
  userId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AccountsReceivable {
  id: string;
  originType: string;
  serviceOrderId: string | null;
  customerId: string;
  originalAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  status: ReceivableStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  document: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'technician' | 'customer';
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  profile: { name: string | null; phone: string | null } | null;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  usageCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: 'home_top' | 'home_middle' | 'home_bottom' | 'sidebar' | 'category';
  sortOrder: number;
  isActive: boolean;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  storeDocument: string | null;
  storeEmail: string | null;
  storePhone: string | null;
  storeWhatsapp: string | null;
  primaryColor: string | null;
  maintenanceMode: boolean;
  allowGuestCheckout: boolean;
}

export interface LogEntry {
  id: string;
  userId: string | null;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  action: string;
  entity: string | null;
  entityId: string | null;
  message: string;
  createdAt: string;
}

export interface Defect {
  id: string;
  name: string;
  description: string | null;
  deviceType: string | null;
  isActive: boolean;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimatedMinutes: number | null;
  deviceType: 'smartphone' | 'tablet' | 'smartwatch' | 'laptop' | 'desktop' | 'other' | null;
  isActive: boolean;
}

export interface WarrantyPolicy {
  id: string;
  name: string;
  description: string | null;
  days: number;
  notes: string | null;
  isActive: boolean;
}

export interface Warranty {
  id: string;
  serviceOrderId: string | null;
  productId: string | null;
  customerId: string;
  type: 'manufacturer' | 'store' | 'service';
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isValid: boolean;
  voidedReason: string | null;
  createdAt: string;
}
