import React from "react";
import { Button, Card, Badge, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { ROLE_PERMS, useApi } from "../lib/api";
import { humanOrderStatus } from "../lib/utils";

export default function Orders({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, reload } = useReloadable(api.listOrders, []);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ order_no: "", eta_at_dealer: "", note: "", quantity: 0, car_model_id: 1 });
  const { data: models } = useReloadable(api.listModels, []);

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Đơn đặt xe từ hãng</h2>
      <Button className="bg-black text-white" onClick={()=>setOpen(true)} disabled={!can("ORDER.CREATE")}>Tạo PO</Button></div>
    <Card>
      <table className="w-full table-auto text-sm">
        <thead><tr className="text-left text-gray-600"><th className="p-2">Số PO</th><th className="p-2">Trạng thái</th><th className="p-2">Ngày dự kiến về</th><th className="p-2">Ghi chú</th><th className="p-2">Thao tác</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={5}>Đang tải…</td></tr> : (data ?? []).map(o => (
            <tr key={o.id} className="border-t">
              <td className="p-2 font-mono">{o.order_no}</td>
              <td className="p-2"><Badge className="bg-gray-100">{humanOrderStatus(o.status)}</Badge></td>
              <td className="p-2">{o.eta_at_dealer?.split("T")[0]}</td>
              <td className="p-2">{o.note ?? ""}</td>
              <td className="p-2 space-x-2">
                <Button onClick={()=>api.updateOrderStatus(o.id,"SUBMITTED").then(reload)} disabled={!can("ORDER.UPDATE_STATUS")}>Gửi</Button>
                <Button onClick={()=>api.updateOrderStatus(o.id,"CONFIRMED").then(reload)} className="bg-green-600 text-white" disabled={!can("ORDER.UPDATE_STATUS")}>Xác nhận</Button>
                <Button onClick={()=>api.updateOrderStatus(o.id,"CANCELLED").then(reload)} className="bg-red-600 text-white" disabled={!can("ORDER.UPDATE_STATUS")}>Hủy</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo PO">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full rounded-xl border p-2" placeholder="PO-2025-003" value={form.order_no} onChange={e=>setForm({...form, order_no:e.target.value})} />
          <input className="w-full rounded-xl border p-2" type="date" value={form.eta_at_dealer.split("T")[0] ?? ""} onChange={e=>setForm({...form, eta_at_dealer:new Date(e.target.value).toISOString()})} />
          <input className="w-full rounded-xl border p-2 col-span-2" placeholder="Ghi chú" value={form.note} onChange={e=>setForm({...form, note:e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs">Dòng xe</label>
            <select className="w-full rounded-xl border p-2" value={form.car_model_id} onChange={e=>setForm({...form, car_model_id:Number(e.target.value)})}>
              {(models ?? []).map(m=><option key={m.id} value={m.id}>{m.brand} {m.model} {m.variant ?? ""}</option>)}
            </select>
          </div>
          <div><label className="text-xs">Số lượng</label>
            <input className="w-full rounded-xl border p-2" type="number" value={form.quantity} onChange={e=>setForm({...form, quantity:Number(e.target.value)})} />
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button onClick={()=>setOpen(false)}>Hủy</Button><Button className="bg-black text-white" onClick={async()=>{ await (api as any).createOrder({ ...form }); setOpen(false); }}>Tạo</Button></div>
      </div>
    </Modal>
  </div>;
}
