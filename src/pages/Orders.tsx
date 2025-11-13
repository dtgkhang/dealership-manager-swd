import React from "react";
import { Button, Card, Badge, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";

// Orders page mapped to backend Purchase Order APIs
export default function Orders({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, error, reload } = useReloadable<any[]>(api.listOrders, []);
  const [open, setOpen] = React.useState(false);
  
  // Backend create PO payload
  const [form, setForm] = React.useState<{ order_no: string; eta_at_dealer: string; note?: string; car_model_id: number; quantity: number }>({ order_no: "", eta_at_dealer: "", note: "", car_model_id: 1, quantity: 1 });
  const [notice, setNotice] = React.useState<string | null>(null);
  const { data: models } = useReloadable<any[]>(api.listModels, []);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Đơn đặt xe từ hãng (PO)</h2>
      <Button className="bg-black text-white" onClick={()=>setOpen(true)} disabled={!can("ORDER.CREATE")}>Tạo PO</Button>
    </div>
    <Card>
      {notice && <div className="mb-2 rounded-lg bg-green-50 p-2 text-sm text-green-700">{notice}</div>}
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="p-2">Số PO</th>
            <th className="p-2">Trạng thái</th>
            <th className="p-2">Ngày dự kiến</th>
            <th className="p-2">Ghi chú</th>
            <th className="p-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={5}>Đang tải…</td></tr> : (data ?? []).map((o: any) => (
            <tr key={o.id} className="border-t">
              <td className="p-2 font-mono">{o.orderNo ?? o.order_no ?? `#${o.id}`}</td>
              <td className="p-2"><Badge className="bg-gray-100">{o.status ?? ''}</Badge></td>
              <td className="p-2">{(o.etaAtDealer ?? o.eta_at_dealer ?? '').toString().split('T')[0]}</td>
              <td className="p-2">{o.note ?? ''}</td>
              <td className="p-2 space-x-2">
                <Button onClick={async()=>{ await api.updateOrderStatus(o.id, 'SUBMITTED'); setNotice(`Đã gửi PO ${o.orderNo ?? o.id}`); reload(); }} disabled={!can("ORDER.UPDATE_STATUS")}>Gửi</Button>
                <Button onClick={async()=>{ await api.updateOrderStatus(o.id, 'CONFIRMED'); setNotice(`Đã xác nhận PO ${o.orderNo ?? o.id}`); reload(); }} className="bg-green-600 text-white" disabled={!can("ORDER.UPDATE_STATUS")}>Xác nhận</Button>
                <Button onClick={async()=>{ await api.updateOrderStatus(o.id, 'CANCELLED'); setNotice(`Đã hủy PO ${o.orderNo ?? o.id}`); reload(); }} className="bg-red-600 text-white" disabled={!can("ORDER.UPDATE_STATUS")}>Hủy</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo PO">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full rounded-xl border p-2" placeholder="PO-2025-001" value={form.order_no} onChange={e=>setForm({...form, order_no: e.target.value})} />
          <input className="w-full rounded-xl border p-2" type="date" value={form.eta_at_dealer?.split('T')[0] ?? ''} onChange={e=>setForm({...form, eta_at_dealer: e.target.value ? new Date(e.target.value).toISOString() : ''})} />
          <input className="w-full rounded-xl border p-2 col-span-2" placeholder="Ghi chú" value={form.note ?? ''} onChange={e=>setForm({...form, note: e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs">Model</label>
            <select className="w-full rounded-xl border p-2" value={form.car_model_id} onChange={e=>setForm({...form, car_model_id: Number(e.target.value)})}>
              {(models ?? []).map((m:any) => (
                <option key={m.id} value={m.id}>{(m.brand?.name ?? '')} {m.model} {(m.variant ?? '')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs">Số lượng</label>
            <input className="w-full rounded-xl border p-2" type="number" value={form.quantity} onChange={e=>setForm({...form, quantity: Number(e.target.value) || 1})} />
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button onClick={()=>setOpen(false)}>Hủy</Button><Button className="bg-black text-white" onClick={async()=>{ try { await (api as any).createOrder({ ...form, modelId: form.car_model_id }); setOpen(false); setNotice(`Tạo PO ${form.order_no} thành công`); reload(); } catch(e:any){ alert(e?.message || 'Tạo PO thất bại'); } }}>Tạo</Button></div>
      </div>
    </Modal>
  </div>;
}
