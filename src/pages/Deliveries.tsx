import React from "react";
import { Button, Card, Modal, Badge } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";
import { currency } from "../lib/utils";
import { formatDateTime } from "../lib/format";
import { getRoleFromToken } from "../lib/api";

export default function Deliveries({
  api,
  can,
  initialOrderId,
  onInitialOrderHandled,
}: {
  api: ReturnType<typeof useApi>;
  can: (p: string) => boolean;
  initialOrderId?: number | null;
  onInitialOrderHandled?: () => void;
}) {
  const { loading, data, error, reload } = useReloadable(api.listDeliveries, []);
  const { data: orders, reload: reloadOrders } = useReloadable((api as any).listCustomerOrders ?? api.listOrders, []);
  const { data: units } = useReloadable(() => (api as any).listVehiclesByStatus ? (api as any).listVehiclesByStatus('AT_DEALER') : api.listVehicles(), []);
  const { data: vouchers } = useReloadable(api.listVouchers, []);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ orderId: number | ""; vehicleUnitId?: number | ""; customerName?: string; priceBefore?: number | ""; voucherCode?: string; status?: string }>(()=>({ orderId: "", vehicleUnitId: "", customerName: "", priceBefore: "", voucherCode: "", status: "Pending" }));
  const [err, setErr] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  // Filters
  const [status, setStatus] = React.useState<string|"">("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [staffQ, setStaffQ] = React.useState("");
  const [modelQ, setModelQ] = React.useState("");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const isManager = getRoleFromToken() === 'MANAGER';
  const [detail, setDetail] = React.useState<any | null>(null);

  // Prefill customerName, priceBefore from selected order
  React.useEffect(()=>{
    if (!form.orderId) return;
    const ordersArr = (orders as any[]) ?? [];
    const o: any = ordersArr.find((x:any)=> x.id === form.orderId);
    if (!o) return;
    setForm(prev => ({
      ...prev,
      customerName: (prev.customerName && prev.customerName.length>0) ? prev.customerName : (o.customerInfo ?? prev.customerName),
      priceBefore: (prev.priceBefore !== '' && prev.priceBefore != null) ? prev.priceBefore : (o.price ?? prev.priceBefore),
    }));
  }, [form.orderId, orders]);

  // Nếu được chuyển từ màn Đơn khách sang với orderId cụ thể -> tự mở modal & chọn đơn
  React.useEffect(() => {
    if (!initialOrderId) return;
    const ordersArr = (orders as any[]) ?? [];
    const exists = ordersArr.some((o: any) => o.id === initialOrderId);
    if (!exists) return;
    setErr(null);
    setNotice(null);
    setOpen(true);
    setForm(prev => ({ ...prev, orderId: initialOrderId as number }));
    if (onInitialOrderHandled) onInitialOrderHandled();
  }, [initialOrderId, orders, onInitialOrderHandled]);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Phiếu giao xe</h2>
      <div className="flex flex-wrap items-center gap-2">
        <select className="rounded-xl border p-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="PENDING">PENDING</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <Button onClick={()=>setAdvancedOpen(v=>!v)}>{advancedOpen ? 'Ẩn bộ lọc' : 'Bộ lọc nâng cao'}</Button>
        <Button variant="primary" onClick={()=>setOpen(true)} disabled={!can("DELIVERY.CREATE")}>Tạo phiếu</Button>
      </div>

      {advancedOpen && (
        <div className="mt-2 rounded-xl border p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-600">Ngày giao từ</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Ngày giao đến</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Mẫu xe</label>
              <input className="w-full rounded-xl border p-2 text-sm" placeholder="Nhập tên mẫu/ID" value={modelQ} onChange={e=>setModelQ(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Nhân viên</label>
              <input className="w-full rounded-xl border p-2 text-sm" placeholder="Tên nhân viên" value={staffQ} onChange={e=>setStaffQ(e.target.value)} disabled={!isManager} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Giá từ</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="number" placeholder="0" value={priceMin} onChange={e=>setPriceMin(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Giá đến</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="number" placeholder="" value={priceMax} onChange={e=>setPriceMax(e.target.value)} />
            </div>
            <div className="md:col-span-4 flex justify-end gap-2">
              <Button onClick={()=>{ setStatus(''); setDateFrom(''); setDateTo(''); setModelQ(''); setPriceMin(''); setPriceMax(''); setStaffQ(''); }}>Reset</Button>
            </div>
          </div>
        </div>
      )}
    </div>
    <Card>
      {(() => {
        const rows: any[] = ((data as any[]) ?? []);
        const total = rows.length;
        const completed = rows.filter(d => ['DELIVERED','COMPLETED'].includes(String(d.status||'').toUpperCase())).length;
        const pending = rows.filter(d => String(d.status||'').toUpperCase()==='PENDING').length;
        const cancelled = rows.filter(d => String(d.status||'').toUpperCase()==='CANCELLED').length;
        return <div className="flex flex-wrap items-center gap-6 text-sm">
          <div><span className="text-gray-600">Tổng phiếu:</span> <span className="font-semibold">{total}</span></div>
          <div><span className="text-gray-600">Đang chờ:</span> <span className="font-semibold">{pending}</span></div>
          <div><span className="text-gray-600">Hoàn tất:</span> <span className="font-semibold">{completed}</span></div>
          <div><span className="text-gray-600">Đã hủy:</span> <span className="font-semibold">{cancelled}</span></div>
        </div>;
      })()}
    </Card>
    <Card>
      {notice && <div className="mb-2 rounded-lg bg-green-50 p-2 text-sm text-green-700">{notice}</div>}
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <div className="overflow-x-auto">
      <table className="min-w-full table-auto text-xs md:text-sm">
        <thead><tr className="text-left text-gray-600">
          <th className="p-2 hidden md:table-cell">ID</th>
          <th className="p-2">Order</th>
          <th className="p-2 hidden md:table-cell">Nhân viên</th>
          <th className="p-2">Mẫu xe</th>
          <th className="p-2">Ngày giao</th>
          <th className="p-2">Trạng thái</th>
          <th className="p-2 hidden md:table-cell">Giá trước</th>
          <th className="p-2 hidden md:table-cell">Giảm</th>
          <th className="p-2">Giá sau</th>
          <th className="p-2">Thao tác</th>
        </tr></thead>
        <tbody>
          {loading ? (
            <tr><td className="p-2" colSpan={10}>Đang tải…</td></tr>
          ) : (() => {
            const rows: any[] = ((data as any[]) ?? []);
            const filtered = rows.filter((d: any) => {
              const st = String(d.status || '').toUpperCase();
              if (status && st !== status) return false;
              const tISO = String(d.deliveryDate || ''); const dt = tISO ? new Date(tISO) : null;
              if (dt && dateFrom) { const f = new Date(dateFrom); if (dt < new Date(f.getFullYear(), f.getMonth(), f.getDate())) return false; }
              if (dt && dateTo) { const t = new Date(dateTo); if (dt > new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999)) return false; }
              const pa = Number(d.priceAfter || 0);
              if (priceMin && pa < Number(priceMin)) return false;
              if (priceMax && pa > Number(priceMax)) return false;
              if (modelQ && !String(d.vehicleName || d.vehicleId || '').toLowerCase().includes(modelQ.toLowerCase())) return false;
              if (isManager && staffQ && !String(d.staffName || '').toLowerCase().includes(staffQ.toLowerCase())) return false;
              return true;
            });
            if (filtered.length === 0) {
              return <tr><td className="p-2 text-gray-500" colSpan={10}>Không có phiếu giao nào phù hợp</td></tr>;
            }
            return filtered.map((d: any) => (
              <tr key={d.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>setDetail(d)}>
                <td className="p-2 hidden md:table-cell">#{d.id}</td>
                <td className="p-2">{d.orderId}</td>
                <td className="p-2 hidden md:table-cell">{d.staffName ?? d.username ?? ''}</td>
                <td className="p-2">{d.vehicleName ?? d.vehicleId ?? ""}</td>
                <td className="p-2">{formatDateTime(d.deliveryDate)}</td>
                <td className="p-2">
                  {(() => {
                    const s = String(d.status || '').toUpperCase();
                    let cls = "bg-gray-100 text-gray-800";
                    if (s === 'PENDING') cls = "bg-blue-50 text-blue-700";
                    else if (s === 'DELIVERED' || s === 'COMPLETED') cls = "bg-green-50 text-green-700";
                    else if (s === 'CANCELLED') cls = "bg-red-50 text-red-700";
                    return <Badge className={cls}>{d.status}</Badge>;
                  })()}
                </td>
                <td className="p-2 hidden md:table-cell">{currency(Number(d.priceBefore || 0))}</td>
                <td className="p-2 hidden md:table-cell">{currency(Number(d.discountApplied || 0))}</td>
                <td className="p-2 font-semibold">{currency(Number(d.priceAfter || 0))}</td>
                <td className="p-2 space-x-2">
                  <Button
                    variant="secondary"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>)=>{ e.stopPropagation(); printDeliveryInvoice(d); }}
                  >
                    In hóa đơn
                  </Button>
                  {(() => { const s = String(d.status || '').toUpperCase(); return s !== "DELIVERED" && s !== "COMPLETED" && s !== "CANCELLED"; })() && (
                    <>
                      <Button
                        variant="success"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          api.completeDelivery(d.id).then(() => {
                            setNotice(`Đã hoàn tất phiếu giao #${d.id}`);
                            reload();
                            reloadOrders?.();
                          });
                        }}
                        disabled={!can("DELIVERY.COMPLETE")}
                      >
                        Hoàn tất
                      </Button>
                      <Button
                        variant="danger"
                        onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          if (!confirm('Xác nhận hủy phiếu giao #' + d.id + '?')) return;
                          try {
                            await (api as any).cancelDelivery(d.id);
                            setNotice(`Đã hủy phiếu giao #${d.id}`);
                            reload();
                            reloadOrders?.();
                          } catch (e: any) { alert(e?.message || 'Hủy thất bại'); }
                        }}
                      >
                        Hủy
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ));
          })()}
        </tbody>
      </table>
      </div>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo phiếu giao">
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Đơn hàng</label>
            <select className="w-full rounded-xl border p-2" value={form.orderId} onChange={e=>setForm({...form, orderId: e.target.value? Number(e.target.value): "" })}>
              <option value="">Chọn đơn</option>
              {((orders as any[]) ?? []).filter((o:any)=> {
                const s = String(o.status||'').toUpperCase();
                return s !== 'COMPLETED' && s !== 'DELIVERED' && s !== 'CANCELLED';
              }).map((o:any)=> <option key={o.id} value={o.id}>#{o.id} – {o.username ?? o.userId ?? ''} · {o.vehicleModel ?? ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs">Xe tại đại lý (VIN)</label>
            {(() => {
              const ordersArr = (orders as any[]) ?? [];
              const sel = ordersArr.find((o:any) => o.id === form.orderId);
              const targetModelId = sel?.vehicleId;
              const unitsArr = (units as any[]) ?? [];
              const filtered = targetModelId ? unitsArr.filter((u:any) => (u.model?.id ?? u.car_model_id) === targetModelId) : [];
              return (
                <select className="w-full rounded-xl border p-2" value={form.vehicleUnitId ?? ""}
                        onChange={e=>setForm({...form, vehicleUnitId: e.target.value? Number(e.target.value): "" as any })}
                        disabled={!form.orderId}>
                  <option value="">{form.orderId ? 'Chọn xe (đúng model đơn)' : 'Chọn đơn trước'}</option>
                  {filtered.map((u:any)=> <option key={u.id} value={u.id}>#{u.id} · {u.vin ?? '(chưa có VIN)'} · {u.model?.model ?? ''}</option>)}
                </select>
              );
            })()}
          </div>
          <input className="w-full rounded-xl border p-2 bg-gray-100" placeholder="Tên khách hàng" value={form.customerName ?? ''} disabled readOnly />
          <input className="w-full rounded-xl border p-2 bg-gray-100" type="number" placeholder="Giá trước" value={form.priceBefore ?? ''} disabled readOnly />
          {/* Voucher đã chuyển về bước Đơn khách */}
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setOpen(false)}>Hủy</Button>
          <Button variant="primary" onClick={async()=>{
            try {
              setErr(null);
              const payload: any = { ...form };
              if (!payload.vehicleUnitId) { setErr('Vui lòng chọn xe (VIN)'); return; }
              if (payload.vehicleUnitId === "") delete payload.vehicleUnitId;
              await (api as any).createDelivery(payload);
              setOpen(false);
              setNotice('Tạo phiếu giao thành công');
              reload();
            } catch (e: any) {
              console.error('Create delivery failed', e);
              setErr(e?.message || 'Tạo phiếu giao thất bại');
            }
          }} disabled={!form.orderId || !form.vehicleUnitId}>Tạo</Button>
        </div>
      </div>
    </Modal>

    <Modal open={!!detail} onClose={()=>setDetail(null)} title={detail ? `Chi tiết phiếu giao #${detail.id}` : "Chi tiết phiếu giao"}>
      {detail && (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Đơn hàng:</span> <span className="font-medium">#{detail.orderId}</span></div>
            <div><span className="text-gray-500">Trạng thái:</span> <span className="font-medium">{detail.status ?? ''}</span></div>
            <div><span className="text-gray-500">Khách hàng:</span> <span className="font-medium">{detail.customerName ?? ''}</span></div>
            <div><span className="text-gray-500">Nhân viên:</span> <span className="font-medium">{detail.staffName ?? detail.username ?? ''}</span></div>
            <div><span className="text-gray-500">Mẫu xe:</span> <span className="font-medium">{detail.vehicleName ?? detail.vehicleId ?? ''}</span></div>
            <div><span className="text-gray-500">Ngày giao:</span> <span className="font-medium">{formatDateTime(detail.deliveryDate)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Giá trước:</span> <span className="font-medium">{currency(Number(detail.priceBefore || 0))}</span></div>
            <div><span className="text-gray-500">Giảm:</span> <span className="font-medium">{currency(Number(detail.discountApplied || 0))}</span></div>
            <div><span className="text-gray-500">Giá sau:</span> <span className="font-semibold">{currency(Number(detail.priceAfter || 0))}</span></div>
            <div><span className="text-gray-500">Đặt cọc:</span> <span className="font-medium">{currency(Number(detail.deposit || 0))}</span></div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={()=>setDetail(null)}>Đóng</Button>
            <Button variant="primary" onClick={()=>printDeliveryInvoice(detail)}>In hóa đơn</Button>
          </div>
        </div>
      )}
    </Modal>
  </div>;
}

function printDeliveryInvoice(d: any) {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  const doc = win.document;
  const delivery = d.deliveryDate ? String(d.deliveryDate).toString().replace('T', ' ').substring(0, 19) : '';
  const priceBefore = Number(d.priceBefore || 0);
  const discount = Number(d.discountApplied || 0);
  const priceAfter = Number(d.priceAfter || 0);
  const deposit = Number(d.deposit || 0);
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Hóa đơn giao xe #${d.id}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td, th { padding: 6px 4px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: left; }
      .right { text-align: right; }
      .muted { color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Hóa đơn giao xe #${d.id}</h1>
    <div class="muted">Ngày giao: ${delivery}</div>
    <h2>Thông tin khách hàng</h2>
    <table>
      <tr><td>Khách hàng</td><td>${d.customerName ?? ''}</td></tr>
      <tr><td>Nhân viên</td><td>${d.staffName ?? d.username ?? ''}</td></tr>
      <tr><td>Đơn hàng liên quan</td><td>#${d.orderId ?? ''}</td></tr>
    </table>
    <h2>Thông tin mẫu xe</h2>
    <table>
      <tr><td>Mẫu xe</td><td>${d.vehicleName ?? d.vehicleId ?? ''}</td></tr>
      <tr><td>Trạng thái</td><td>${d.status ?? ''}</td></tr>
    </table>
    <h2>Thanh toán</h2>
    <table>
      <tr><td>Giá trước khuyến mãi</td><td class="right">${priceBefore.toLocaleString('vi-VN')} đ</td></tr>
      <tr><td>Giảm giá</td><td class="right">- ${discount.toLocaleString('vi-VN')} đ</td></tr>
      <tr><td>Giá sau khuyến mãi</td><td class="right"><strong>${priceAfter.toLocaleString('vi-VN')} đ</strong></td></tr>
      <tr><td>Đặt cọc</td><td class="right">${deposit.toLocaleString('vi-VN')} đ</td></tr>
    </table>
  </body>
</html>`);
  doc.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
