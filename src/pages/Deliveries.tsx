import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";
import { currency } from "../lib/utils";
import { formatDateTime } from "../lib/format";
import { getRoleFromToken } from "../lib/api";

export default function Deliveries({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, error, reload } = useReloadable(api.listDeliveries, []);
  const { data: orders, reload: reloadOrders } = useReloadable((api as any).listCustomerOrders ?? api.listOrders, []);
  const { data: units } = useReloadable(() => (api as any).listVehiclesByStatus ? (api as any).listVehiclesByStatus('AT_DEALER') : api.listVehicles(), []);
  const { data: vouchers } = useReloadable(api.listVouchers, []);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ orderId: number | ""; vehicleUnitId?: number | ""; customerName?: string; priceBefore?: number | ""; voucherCode?: string; status?: string }>(()=>({ orderId: "", vehicleUnitId: "", customerName: "", priceBefore: "", voucherCode: "", status: "Pending" }));
  const [err, setErr] = React.useState<string | null>(null);
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
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <div className="overflow-x-auto">
      <table className="min-w-full table-auto text-xs md:text-sm">
        <thead><tr className="text-left text-gray-600">
          <th className="p-2 hidden md:table-cell">ID</th>
          <th className="p-2">Order</th>
          <th className="p-2 hidden md:table-cell">Nhân viên</th>
          <th className="p-2">Xe</th>
          <th className="p-2">Ngày giao</th>
          <th className="p-2">Trạng thái</th>
          <th className="p-2 hidden md:table-cell">Giá trước</th>
          <th className="p-2 hidden md:table-cell">Giảm</th>
          <th className="p-2">Giá sau</th>
          <th className="p-2">Thao tác</th>
        </tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={10}>Đang tải…</td></tr> : ((data as any[]) ?? []).filter((d:any)=>{
            const st = String(d.status||'').toUpperCase();
            if (status && st !== status) return false;
            const tISO = String(d.deliveryDate||''); const dt = tISO ? new Date(tISO) : null;
            if (dt && dateFrom) { const f = new Date(dateFrom); if (dt < new Date(f.getFullYear(),f.getMonth(),f.getDate())) return false; }
            if (dt && dateTo) { const t = new Date(dateTo); if (dt > new Date(t.getFullYear(),t.getMonth(),t.getDate(),23,59,59,999)) return false; }
            const pa = Number(d.priceAfter || 0);
            if (priceMin && pa < Number(priceMin)) return false;
            if (priceMax && pa > Number(priceMax)) return false;
            if (modelQ && !String(d.vehicleName || d.vehicleId || '').toLowerCase().includes(modelQ.toLowerCase())) return false;
            if (isManager && staffQ && !String(d.staffName||'').toLowerCase().includes(staffQ.toLowerCase())) return false;
            return true;
          }).map((d: any) => (
            <tr key={d.id} className="border-t">
              <td className="p-2 hidden md:table-cell">#{d.id}</td>
              <td className="p-2">{d.orderId}</td>
              <td className="p-2 hidden md:table-cell">{d.staffName ?? d.username ?? ''}</td>
              <td className="p-2">{d.vehicleName ?? d.vehicleId ?? ""}</td>
              <td className="p-2">{formatDateTime(d.deliveryDate)}</td>
              <td className="p-2">{d.status}</td>
              <td className="p-2 hidden md:table-cell">{currency(Number(d.priceBefore || 0))}</td>
              <td className="p-2 hidden md:table-cell">{currency(Number(d.discountApplied || 0))}</td>
              <td className="p-2 font-semibold">{currency(Number(d.priceAfter || 0))}</td>
              <td className="p-2">
                {(() => { const s = String(d.status||'').toUpperCase(); return s!=="DELIVERED" && s!=="COMPLETED" && s!=="CANCELLED"; })() && (
                  <>
                    <Button variant="success" onClick={()=>api.completeDelivery(d.id).then(()=>{ reload(); reloadOrders?.(); })} disabled={!can("DELIVERY.COMPLETE")}>
                      Hoàn tất
                    </Button>
                    <Button variant="danger" onClick={async()=>{ if(!confirm('Xác nhận hủy phiếu giao #' + d.id + '?')) return; try { await (api as any).cancelDelivery(d.id); reload(); reloadOrders?.(); } catch(e:any){ alert(e?.message || 'Hủy thất bại'); } }}>
                      Hủy
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
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
              reload();
            } catch (e: any) {
              console.error('Create delivery failed', e);
              setErr(e?.message || 'Tạo phiếu giao thất bại');
            }
          }} disabled={!form.orderId || !form.vehicleUnitId}>Tạo</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
