import { addDays, delay, nowISO } from "./utils";
import type { CarModel, Delivery, DeliveryStatus, ManufacturerOrder, OrderStatus, Role, VehicleUnit, Voucher } from "./types";

// Backend HTTP helper
const ENV: any = (typeof import.meta !== 'undefined') ? (import.meta as any).env ?? {} : {};
const API_BASE = ENV.VITE_API_BASE || ""; // empty = same-origin
const USE_MOCK = ENV.VITE_USE_MOCK === '1';
const useBackend = !USE_MOCK; // default: use backend

export function getToken(): string | null {
  return (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null;
}

export function setToken(token: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem('token', token); else localStorage.removeItem('token');
}

export function getRoleFromToken(): 'MANAGER' | 'STAFF' | null {
  const t = getToken();
  if (!t) return null;
  const parts = t.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    const role = (json.role ?? json.authorities ?? json.auth ?? '').toString().toUpperCase();
    if (role.includes('MANAGER')) return 'MANAGER';
    if (role.includes('STAFF')) return 'STAFF';
    return null;
  } catch { return null; }
}

async function http(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as any || {}),
  };
  // Đừng gửi Authorization cho endpoint auth
  if (token && !path.startsWith('/api/auth/')) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(()=>"");
    console.error('API error', { path, status: res.status, body: text });
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export async function login(email: string, password: string) {
  if (!useBackend) {
    // mock login
    await delay(100);
    const fake = { token: 'mock-token', email, tokenType: 'Bearer' } as any;
    setToken(fake.token);
    return fake;
  }
  const data = await http('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setToken(data.token);
  return data;
}

export async function register(input: { name: string; email: string; password: string; roleId?: number }) {
  if (!useBackend) {
    // mock register: succeed immediately
    await delay(100);
    return { success: true } as any;
  }
  const data = await http('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return data;
}

export function logout() {
  setToken(null);
}

// In-memory DB (ẩn khỏi UI, dùng cho mock)
const mockDB = (() => {
  let modelId = 1, orderId = 1, vehicleId = 1, voucherId = 1, deliveryId = 1;
  const car_models: CarModel[] = [
    { id: modelId++, brand: "Toyota", model: "Corolla", variant: "1.8 AT", msrp: 620_000_000 },
    { id: modelId++, brand: "Toyota", model: "Camry", variant: "2.5 AT", msrp: 1_150_000_000 },
    { id: modelId++, brand: "Honda", model: "Civic", variant: "1.5 Turbo", msrp: 780_000_000 },
  ];
  const manufacturer_orders: ManufacturerOrder[] = [
    { id: orderId++, order_no: "PO-2025-001", status: "CONFIRMED", eta_at_dealer: addDays(14), note: "Lô đầu tiên", created_at: nowISO(), updated_at: nowISO() },
    { id: orderId++, order_no: "PO-2025-002", status: "SUBMITTED", eta_at_dealer: addDays(18), note: "Camry đen", created_at: nowISO(), updated_at: nowISO() },
  ];
  const vehicle_units: VehicleUnit[] = [
    { id: vehicleId++, car_model_id: 1, order_id: 1, status: "ON_ORDER", created_at: nowISO(), updated_at: nowISO() },
    { id: vehicleId++, car_model_id: 1, order_id: 1, status: "ON_ORDER", created_at: nowISO(), updated_at: nowISO() },
    { id: vehicleId++, car_model_id: 2, order_id: 2, status: "ON_ORDER", created_at: nowISO(), updated_at: nowISO() },
    { id: vehicleId++, vin: "JT123456789000001", car_model_id: 3, order_id: null, status: "AT_DEALER", arrived_at: addDays(-1), created_at: nowISO(), updated_at: nowISO() },
  ];
  const vouchers: Voucher[] = [
    { id: voucherId++, code: "FLAT10M", type: "FLAT", title: "Giảm 10 triệu", min_price: 600_000_000, max_discount: 10_000_000, amount: 10_000_000, stackable: false, created_at: nowISO(), usable_from: addDays(-7), usable_to: addDays(30) },
    { id: voucherId++, code: "PCT05", type: "PERCENT", title: "Giảm 5%", min_price: 500_000_000, max_discount: 30_000_000, percent: 5, stackable: true, created_at: nowISO(), usable_from: addDays(-1), usable_to: addDays(20) },
  ];
  const deliveries: Delivery[] = [];

  function computeVoucherDiscount(v: Voucher, price?: number): number {
    if (!price || price <= 0) return 0;
    const inWindow = (!v.usable_from || new Date(v.usable_from) <= new Date()) && (!v.usable_to || new Date(v.usable_to) >= new Date());
    if (!inWindow) return 0;
    if (v.min_price && price < v.min_price) return 0;
    let d = 0;
    if (v.type === "FLAT" && v.amount) d = v.amount;
    if (v.type === "PERCENT" && v.percent) d = (price * v.percent) / 100;
    if (v.max_discount != null) d = Math.min(d, v.max_discount);
    return Math.max(0, Math.round(d / 1000) * 1000);
  }

  return {
    car_models, manufacturer_orders, vehicle_units, vouchers, deliveries, computeVoucherDiscount,
    createVoucher(input: Omit<Voucher, "id" | "created_at">) {
      if (!input.code?.trim()) throw new Error("Mã không được trống");
      if (vouchers.some(v => v.code.toUpperCase() === input.code.toUpperCase())) throw new Error("Mã đã tồn tại");
      if (!input.title?.trim()) throw new Error("Tiêu đề không được trống");
      if (input.type === "FLAT" && !(input.amount && input.amount > 0)) throw new Error("Số tiền giảm không hợp lệ");
      if (input.type === "PERCENT" && !(input.percent && input.percent > 0)) throw new Error("Phần trăm không hợp lệ");
      const row: Voucher = { id: ++voucherId, created_at: nowISO(), ...input } as Voucher;
      vouchers.push(row);
      return row;
    },
    createOrder(input: { order_no: string; eta_at_dealer?: string; note?: string; created_by?: number; quantity?: number; car_model_id?: number; }) {
      const row: ManufacturerOrder = { id: ++orderId, order_no: input.order_no, status: "DRAFT", eta_at_dealer: input.eta_at_dealer, note: input.note, created_at: nowISO(), updated_at: nowISO() };
      manufacturer_orders.push(row);
      if (input.quantity && input.car_model_id) {
        for (let i = 0; i < input.quantity; i++) {
          vehicle_units.push({ id: ++vehicleId, car_model_id: input.car_model_id, order_id: row.id, status: "ON_ORDER", created_at: nowISO(), updated_at: nowISO() });
        }
      }
      return row;
    },
    updateOrderStatus(id: number, status: OrderStatus) {
      const row = manufacturer_orders.find(o => o.id === id); if (!row) throw new Error("Không tìm thấy PO");
      row.status = status; row.updated_at = nowISO(); return row;
    },
    markVehicleArrived(id: number, vin?: string) {
      const v = vehicle_units.find(u => u.id === id); if (!v) throw new Error("Không tìm thấy xe");
      v.status = "AT_DEALER"; v.arrived_at = nowISO(); v.updated_at = nowISO(); if (vin) v.vin = vin; return v;
    },
    setVehicleVIN(id: number, vin: string) { const v = vehicle_units.find(u => u.id === id); if (!v) throw new Error("Không tìm thấy xe"); v.vin = vin; v.updated_at = nowISO(); return v; },
    createDelivery(input: Omit<Delivery, "id" | "status" | "created_at" | "updated_at"> & { status?: DeliveryStatus }) {
      const veh = vehicle_units.find(u => u.id === input.vehicle_id); if (!veh) throw new Error("Không tìm thấy xe");
      if (veh.status !== "AT_DEALER") throw new Error("Xe chưa về đại lý");
      const row: Delivery = { id: ++deliveryId, status: input.status ?? "RESERVED", created_at: nowISO(), updated_at: nowISO(), ...input };
      if (row.voucher_id && row.price_before) {
        const v = vouchers.find(x => x.id === row.voucher_id);
        if (v) { const d = computeVoucherDiscount(v, row.price_before); row.discount_applied = d; row.price_after = Math.max(0, (row.price_before ?? 0) - d); }
      }
      deliveries.push(row); return row;
    },
    completeDelivery(id: number) {
      const d = deliveries.find(x => x.id === id); if (!d) throw new Error("Không tìm thấy phiếu giao");
      d.status = "COMPLETED"; d.delivered_at = nowISO(); d.updated_at = nowISO();
      const veh = vehicle_units.find(u => u.id === d.vehicle_id); if (veh) { veh.status = "DELIVERED"; veh.delivered_at = d.delivered_at; veh.updated_at = nowISO(); }
      return d;
    },
  };
})();

export const ROLE_PERMS: Record<Role, string[]> = {
  MANAGER: ["ORDER.CREATE","ORDER.UPDATE_STATUS","VEHICLE.MARK_ARRIVED","VEHICLE.SET_VIN","VOUCHER.CREATE","DELIVERY.COMPLETE","DELIVERY.CREATE"],
  STAFF: ["DELIVERY.CREATE","DELIVERY.COMPLETE"],
};

export const BACKEND_MODE = useBackend;

export function useApi(role: Role) {
  if (!useBackend) {
    return {
      listModels: async () => { await delay(80); return [...(mockDB as any).car_models]; },
      listOrders: async () => { await delay(80); return [...(mockDB as any).manufacturer_orders]; },
      listVehicles: async () => { await delay(80); return [...(mockDB as any).vehicle_units]; },
      listVouchers: async () => { await delay(80); return [...(mockDB as any).vouchers]; },
      listDeliveries: async () => { await delay(80); return [...(mockDB as any).deliveries]; },
      createVoucher: async (args: any) => { if (!ROLE_PERMS[role].includes("VOUCHER.CREATE")) throw new Error("Không có quyền"); await delay(80); return (mockDB as any).createVoucher(args); },
      createOrder: async (args: any) => { if (!ROLE_PERMS[role].includes("ORDER.CREATE")) throw new Error("Không có quyền"); await delay(80); return (mockDB as any).createOrder(args); },
      updateOrderStatus: async (id: number, s: OrderStatus) => { if (!ROLE_PERMS[role].includes("ORDER.UPDATE_STATUS")) throw new Error("Không có quyền"); await delay(80); return (mockDB as any).updateOrderStatus(id,s); },
      markVehicleArrived: async (id: number, vin?: string) => { if (!ROLE_PERMS[role].includes("VEHICLE.MARK_ARRIVED")) throw new Error("Không có quyền"); await delay(80); return (mockDB as any).markVehicleArrived(id, vin); },
      setVehicleVIN: async (id: number, vin: string) => { if (!ROLE_PERMS[role].includes("VEHICLE.SET_VIN")) throw new Error("Không có quyền"); await delay(80); return (mockDB as any).setVehicleVIN(id, vin); },
      createDelivery: async (args: any) => { if (!ROLE_PERMS[role].includes("DELIVERY.CREATE")) throw new Error("Không có quyền"); await delay(80); return (mockDB as any).createDelivery(args); },
      completeDelivery: async (id: number) => { if (!ROLE_PERMS[role].includes("DELIVERY.COMPLETE")) throw new Error("Không có quyền"); await delay(80); return (mockDB as any).completeDelivery(id); },
      computeVoucherDiscount: (v: Voucher, price?: number) => (mockDB as any).computeVoucherDiscount(v, price),
    };
  }

  // Backend-backed API (only supported features)
  return {
    // Models
    listModels: async () => {
      const data = await http('/api/models');
      return data;
    },
    // Vehicle units for inventory
    listVehicles: async () => {
      const data = await http('/api/vehicle-units');
      return data;
    },
    markVehicleArrived: async (id: number) => {
      const data = await http(`/api/vehicle-units/${id}/arrive`, { method: 'PATCH' });
      return data;
    },
    setVehicleVIN: async (id: number, vin: string) => {
      const data = await http(`/api/vehicle-units/${id}/vin?vin=${encodeURIComponent(vin)}`, { method: 'PATCH' });
      return data;
    },
    listVouchers: async () => {
      const data = await http('/api/vouchers');
      return data;
    },
    computeVoucherDiscount: (_v: Voucher, _price?: number) => 0,

    // Purchase Orders (PO)
    listOrders: async () => {
      const data = await http('/api/po');
      return data;
    },
    createOrder: async (args: { order_no: string; eta_at_dealer?: string; note?: string; car_model_id?: number; quantity?: number; modelId?: number; }) => {
      if (!ROLE_PERMS[role].includes("ORDER.CREATE")) throw new Error("Không có quyền");
      const payload: any = { orderNo: args.order_no, etaAtDealer: args.eta_at_dealer, note: args.note, modelId: args.modelId ?? args.car_model_id, quantity: args.quantity };
      const data = await http('/api/po', { method: 'POST', body: JSON.stringify(payload) });
      return data;
    },
    updateOrderStatus: async (id: number, s: any) => {
      if (!ROLE_PERMS[role].includes("ORDER.UPDATE_STATUS")) throw new Error("Không có quyền");
      const data = await http(`/api/po/${id}/status?status=${encodeURIComponent(String(s))}`, { method: 'PUT' });
      return data;
    },

    // Deliveries
    listDeliveries: async () => {
      const data = await http('/api/deliveries');
      return data;
    },
    createDelivery: async (args: { orderId: number; vehicleUnitId?: number; customerName?: string; priceBefore?: number; voucherCode?: string; status?: string }) => {
      if (!ROLE_PERMS[role].includes("DELIVERY.CREATE")) throw new Error("Không có quyền");
      const data = await http('/api/deliveries', { method: 'POST', body: JSON.stringify(args) });
      return data;
    },
    completeDelivery: async (id: number) => {
      if (!ROLE_PERMS[role].includes("DELIVERY.COMPLETE")) throw new Error("Không có quyền");
      const data = await http(`/api/deliveries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Delivered' }) });
      return data;
    },

    createVoucher: async (args: any) => {
      if (!ROLE_PERMS[role].includes("VOUCHER.CREATE")) throw new Error("Không có quyền");
      const payload: any = {
        code: args.code,
        type: args.type,
        title: args.title,
        minPrice: args.min_price,
        maxDiscount: args.max_discount,
        amount: args.amount,
        percent: args.percent,
        usableFrom: args.usable_from || undefined,
        usableTo: args.usable_to || undefined,
        stackable: !!args.stackable,
      };
      const data = await http('/api/vouchers', { method: 'POST', body: JSON.stringify(payload) });
      return data;
    },
  } as any;
}
