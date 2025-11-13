import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";

export default function CustomerOrders({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, error, reload } = useReloadable((api as any).listCustomerOrders, []);
  const [q, setQ] = React.useState("");
  const { data: models } = useReloadable(api.listModels, []);
  const [open, setOpen] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ vehicleId: number | ""; customerInfo: string; brand?: string; price?: number | ""; deliveryDate?: string }>(()=>({ vehicleId: "", customerInfo: "", brand: "", price: "", deliveryDate: "" }));

  const modelById = React.useMemo(()=> new Map((models ?? []).map((m: any) => [m.id, m])), [models]);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Đơn khách hàng</h2>
      <div className="flex items-center gap-2">
        <input className="rounded-xl border p-2 text-sm" placeholder="Tìm khách / mẫu xe" value={q} onChange={e=>setQ(e.target.value)} />
        <Button variant="primary" onClick={()=>{ setOpen(true); setErr(null); setNotice(null); }}>Tạo đơn</Button>
      </div>
    </div>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      {notice && <div className="mb-2 rounded-lg bg-green-50 p-2 text-sm text-green-700">{notice}</div>}
      <table className="w-full table-auto text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="p-2">ID</th>
            <th className="p-2">Khách hàng</th>
            <th className="p-2">Mẫu xe</th>
            <th className="p-2">Giá</th>
            <th className="p-2">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={5}>Đang tải…</td></tr> : (data ?? []).filter((o:any)=>{
            const s=(q||"").toLowerCase(); if(!s) return true;
            const model = modelById.get(o.vehicleId)?.model ?? o.vehicleModel ?? '';
            return (String(o.customerInfo ?? '').toLowerCase().includes(s) || String(model).toLowerCase().includes(s));
          }).map((o: any) => (
            <tr key={o.id} className="border-t">
              <td className="p-2">#{o.id}</td>
              <td className="p-2">{o.customerInfo ?? ''}</td>
              <td className="p-2">{o.vehicleModel ?? (modelById.get(o.vehicleId)?.model ?? o.vehicleId)}</td>
              <td className="p-2">{o.price ?? ''}</td>
              <td className="p-2">{o.status ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo đơn khách hàng">
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Mẫu xe</label>
            <select className="w-full rounded-xl border p-2" value={form.vehicleId}
                    onChange={e=>{
                      const id = e.target.value ? Number(e.target.value) : "" as any;
                      const m: any = id ? modelById.get(id) : null;
                      setForm({ ...form, vehicleId: id, brand: m?.brand?.name ?? '' });
                    }}>
              <option value="">Chọn mẫu</option>
              {(models ?? []).map((m:any) => (
                <option key={m.id} value={m.id}>{(m.brand?.name ?? '')} {m.model}</option>
              ))}
            </select>
          </div>
          <div>
            <input className={`w-full rounded-xl border p-2 ${err && (!form.customerInfo || !form.customerInfo.trim()) ? 'border-red-500' : ''}`} placeholder="Tên khách / ghi chú" value={form.customerInfo} onChange={e=>setForm({ ...form, customerInfo: e.target.value })} />
            {err && (!form.customerInfo || !form.customerInfo.trim()) && <div className="mt-1 text-xs text-red-600">Vui lòng nhập thông tin khách</div>}
          </div>
          <div>
            <input className={`w-full rounded-xl border p-2 ${err && (typeof form.price==='number' && form.price <= 0) ? 'border-red-500' : ''}`} type="number" placeholder="Giá bán (VNĐ)" min={0} value={form.price ?? ''} onChange={e=>{ const v=e.target.value; setForm({ ...form, price: v===''? '' : Number(v) }); }} />
            {err && (typeof form.price==='number' && form.price <= 0) && <div className="mt-1 text-xs text-red-600">Giá phải &gt; 0</div>}
          </div>
          <div>
            <label className="text-xs">Ngày giao dự kiến</label>
            <input className="w-full rounded-xl border p-2" type="date" value={(form.deliveryDate || '').split('T')[0]}
                   onChange={e=> setForm({ ...form, deliveryDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setOpen(false)}>Hủy</Button>
          <Button variant="primary" onClick={async()=>{
            try {
              setErr(null);
              if (!form.vehicleId) { setErr('Vui lòng chọn mẫu xe'); return; }
              if (!form.customerInfo || !form.customerInfo.trim()) { setErr('Vui lòng nhập thông tin khách'); return; }
              if (typeof form.price === 'number' && form.price <= 0) { setErr('Giá bán phải > 0'); return; }
              const payload: any = {
                vehicleId: form.vehicleId,
                customerInfo: form.customerInfo.trim(),
                brand: form.brand,
                price: typeof form.price === 'number' ? form.price : undefined,
                deliveryDate: form.deliveryDate || undefined,
              };
              await (api as any).createCustomerOrder(payload);
              setOpen(false);
              setNotice('Tạo đơn thành công');
              reload();
            } catch (e:any) {
              console.error('Create customer order failed', e);
              setErr(e?.message || 'Tạo đơn thất bại');
            }
          }} disabled={!form.vehicleId || !form.customerInfo}>Tạo</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
