export type Role = "MANAGER" | "STAFF";
export type VehicleStatus = "ON_ORDER" | "AT_DEALER" | "DELIVERED";
export type OrderStatus = "DRAFT" | "SUBMITTED" | "CONFIRMED" | "CANCELLED";
export type VoucherType = "FLAT" | "PERCENT" | "PACKAGE";
export type DeliveryStatus = "RESERVED" | "COMPLETED" | "CANCELLED";

export interface CarModel { id: number; brand: string; model: string; variant?: string; msrp?: number; }
export interface ManufacturerOrder { id: number; order_no: string; status: OrderStatus; eta_at_dealer?: string; note?: string; created_at: string; updated_at: string; }
export interface VehicleUnit { id: number; vin?: string; car_model_id: number; order_id?: number | null; status: VehicleStatus; arrived_at?: string; delivered_at?: string; created_at: string; updated_at: string; }
export interface Voucher { id: number; code: string; type: VoucherType; title: string; min_price?: number; max_discount?: number; amount?: number; percent?: number; usable_from?: string; usable_to?: string; stackable: boolean; created_at: string; }
export interface Delivery { id: number; vehicle_id: number; voucher_id?: number | null; customer_name: string; price_before?: number; discount_applied?: number; price_after?: number; deposit?: number; delivered_at?: string; status: DeliveryStatus; created_at: string; updated_at: string; }

