import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";

export default function Deliveries({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, error, reload } = useReloadable(api.listDeliveries, []);
  const { data: orders } = useReloadable(api.listOrders, []);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{ orderId: number | ""; vehicleUnitId?: number | ""; customerName?: string; priceBefore?: number | ""; voucherCode?: string; status?: string }>(()=>({ orderId: "", vehicleUnitId: "", customerName: "", priceBefore: "", voucherCode: "", status: "Pending" }));

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Phiếu giao xe</h2>
      <Button className="bg-black text-white" onClick={()=>setOpen(true)} disabled={!can("DELIVERY.CREATE")}>Tạo phiếu</Button>
    </div>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <table className="w-full table-auto text-sm">
        <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">Order</th><th className="p-2">Xe</th><th className="p-2">Ngày giao</th><th className="p-2">Trạng thái</th><th className="p-2">Thao tác</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={6}>Đang tải…</td></tr> : (data ?? []).map((d: any) => (
            <tr key={d.id} className="border-t">
              <td className="p-2">#{d.id}</td>
              <td className="p-2">{d.orderId}</td>
              <td className="p-2">{d.vehicleId ?? ""}</td>
              <td className="p-2">{d.deliveryDate?.split('T').join(' ').slice(0,16) ?? ""}</td>
              <td className="p-2">{d.status}</td>
              <td className="p-2">
                {d.status!=="Delivered" && <Button className="bg-green-600 text-white" onClick={()=>api.completeDelivery(d.id).then(reload)} disabled={!can("DELIVERY.COMPLETE")}>Hoàn tất</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo phiếu giao">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Đơn hàng</label>
            <select className="w-full rounded-xl border p-2" value={form.orderId} onChange={e=>setForm({...form, orderId: e.target.value? Number(e.target.value): "" })}>
              <option value="">Chọn đơn</option>
              {(orders ?? []).map((o:any)=> <option key={o.id} value={o.id}>#{o.id} – {o.username ?? o.userId} · {o.vehicleModel ?? ''}</option>)}
            </select>
          </div>
          <input className="w-full rounded-xl border p-2" placeholder="Vehicle Unit ID (VIN)" value={form.vehicleUnitId ?? ""} onChange={e=>setForm({...form, vehicleUnitId: e.target.value? Number(e.target.value): "" as any })} />
          <input className="w-full rounded-xl border p-2" placeholder="Tên khách hàng" value={form.customerName ?? ''} onChange={e=>setForm({...form, customerName: e.target.value})} />
          <input className="w-full rounded-xl border p-2" type="number" placeholder="Giá trước" value={form.priceBefore ?? ''}
                 onChange={e=>{ const v=e.target.value; if (v==='') setForm({...form, priceBefore: ''}); else setForm({...form, priceBefore: Number(v)}); }} />
          <input className="w-full rounded-xl border p-2" placeholder="Mã voucher (nếu có)" value={form.voucherCode ?? ''} onChange={e=>setForm({...form, voucherCode: e.target.value})} />
          <select className="w-full rounded-xl border p-2" value={form.status ?? ""} onChange={e=>setForm({...form, status: e.target.value})}>
            <option value="Pending">Pending</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setOpen(false)}>Hủy</Button>
          <Button className="bg-black text-white" onClick={async()=>{
            const payload: any = { ...form };
            if (payload.vehicleUnitId === "") delete payload.vehicleUnitId;
            await (api as any).createDelivery(payload);
            setOpen(false);
            reload();
          }} disabled={!form.orderId}>Tạo</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
