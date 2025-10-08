export const nowISO = () => new Date().toISOString();
export const addDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
export const currency = (n?: number) => (n == null ? "—" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n));
export const clsx = (...arr: Array<string | false | undefined>) => arr.filter(Boolean).join(" ");
export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const humanOrderStatus = (s: string) => ({
  DRAFT: "Nháp",
  SUBMITTED: "Đã gửi",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
} as Record<string,string>)[s] ?? s;

export const humanVehicleStatus = (s: string) => ({
  ON_ORDER: "Đang đặt",
  AT_DEALER: "Tại đại lý",
  DELIVERED: "Đã giao",
} as Record<string,string>)[s] ?? s;

export const humanDeliveryStatus = (s: string) => ({
  RESERVED: "Đã đặt",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
} as Record<string,string>)[s] ?? s;

