import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";
import { currency } from "../lib/utils";

export default function Deliveries({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, error, reload } = useReloadable(api.listDeliveries, []);
  const { data: orders, reload: reloadOrders } = useReloadable((api as any).listCustomerOrders ?? api.listOrders, []);
  const { data: units } = useReloadable(() => (api as any).listVehiclesByStatus ? (api as any).listVehiclesByStatus('AT_DEALER') : api.listVehicles(), []);
  const { data: vouchers } = useReloadable(api.listVouchers, []);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ orderId: number | ""; vehicleUnitId?: number | ""; customerName?: string; priceBefore?: number | ""; voucherCode?: string; status?: string }>(()=>({ orderId: "", vehicleUnitId: "", customerName: "", priceBefore: "", voucherCode: "", status: "Pending" }));
  const [err, setErr] = React.useState<string | null>(null);

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
      <Button variant="primary" onClick={()=>setOpen(true)} disabled={!can("DELIVERY.CREATE")}>Tạo phiếu</Button>
    </div>
    <Card>
      {(() => {
        const rows: any[] = ((data as any[]) ?? []);
        const delivered = rows.filter(d => {
          const s = String(d.status || '').toUpperCase();
          return s === 'DELIVERED' || s === 'COMPLETED';
        });
        const total = delivered.reduce((sum, d:any) => sum + Number(d.priceAfter || 0), 0);
        return <div className="flex items-center gap-6 text-sm">
          <div><span className="text-gray-600">Số phiếu đã hoàn tất:</span> <span className="font-semibold">{delivered.length}</span></div>
          <div><span className="text-gray-600">Doanh thu:</span> <span className="font-semibold">{currency(total)}</span></div>
        </div>;
      })()}
    </Card>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <table className="w-full table-auto text-sm">
        <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">Order</th><th className="p-2">Nhân viên</th><th className="p-2">Xe</th><th className="p-2">Ngày giao</th><th className="p-2">Trạng thái</th><th className="p-2">Giá trước</th><th className="p-2">Giảm</th><th className="p-2">Giá sau</th><th className="p-2">Thao tác</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={10}>Đang tải…</td></tr> : ((data as any[]) ?? []).map((d: any) => (
            <tr key={d.id} className="border-t">
              <td className="p-2">#{d.id}</td>
              <td className="p-2">{d.orderId}</td>
              <td className="p-2">{d.staffName ?? d.username ?? ''}</td>
              <td className="p-2">{d.vehicleId ?? ""}</td>
              <td className="p-2">{d.deliveryDate?.split('T').join(' ').slice(0,16) ?? ""}</td>
              <td className="p-2">{d.status}</td>
              <td className="p-2">{currency(Number(d.priceBefore || 0))}</td>
              <td className="p-2">{currency(Number(d.discountApplied || 0))}</td>
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
            <select className="w-full rounded-xl border p-2" value={form.vehicleUnitId ?? ""} onChange={e=>setForm({...form, vehicleUnitId: e.target.value? Number(e.target.value): "" as any })}>
              <option value="">Chọn xe (AT_DEALER)</option>
              {((units as any[]) ?? []).map((u:any)=> <option key={u.id} value={u.id}>#{u.id} · {u.vin ?? '(chưa có VIN)'} · {u.model?.model ?? ''}</option>)}
            </select>
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
