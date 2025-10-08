import { addDays, delay, nowISO } from "./utils";
import type { CarModel, Delivery, DeliveryStatus, ManufacturerOrder, OrderStatus, Role, VehicleUnit, Voucher } from "./types";

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

export function useApi(role: Role) {
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
