import React from "react";
import { Badge, Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import type { VehicleUnit } from "../lib/types";
import { humanVehicleStatus, currency } from "../lib/utils";
import { useApi, BACKEND_MODE } from "../lib/api";

export default function Inventory({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, error, reload } = useReloadable(api.listVehicles, []);
  const { data: models } = useReloadable(api.listModels, []);
  const modelById = React.useMemo(()=> new Map((models ?? []).map(m => [m.id, m])), [models]);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<string|"">("");
  const [vinInput, setVinInput] = React.useState(""); const [selected, setSelected] = React.useState<VehicleUnit | any | null>(null);
  const [openVIN, setOpenVIN] = React.useState(false); const [openDeliver, setOpenDeliver] = React.useState(false);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Kho xe tại đại lý</h2>
      <div className="flex items-center gap-2">
        <input className="rounded-xl border p-2 text-sm" placeholder="Tìm VIN / model" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="rounded-xl border p-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="ON_ORDER">ON_ORDER</option>
          <option value="AT_DEALER">AT_DEALER</option>
          <option value="DELIVERED">DELIVERED</option>
        </select>
      </div>
    </div>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      {!BACKEND_MODE ? (
        <table className="w-full table-auto text-sm">
          <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">VIN</th><th className="p-2">Dòng xe</th><th className="p-2">Trạng thái</th><th className="p-2">Ngày về</th><th className="p-2">Thao tác</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="p-2" colSpan={6}>Đang tải…</td></tr> : (data ?? []).filter((v:any)=>{
              if (status && v.status !== status) return false;
              const s = (q||"").toLowerCase(); if (!s) return true;
              const model = (()=>{ const m = modelById.get(v.car_model_id); return m ? `${m.brand} ${m.model} ${m.variant ?? ""}` : v.model?.model ?? ''; })().toLowerCase();
              return (String(v.vin ?? '').toLowerCase().includes(s) || model.includes(s));
            }).map((v: any) => (
              <tr key={v.id} className="border-t">
                <td className="p-2">#{v.id}</td>
                <td className="p-2 font-mono">{v.vin ?? <span className="text-gray-400">(chưa có)</span>}</td>
                <td className="p-2">{(()=>{ const m = modelById.get(v.car_model_id); return m ? `${m.brand} ${m.model} ${m.variant ?? ""}` : v.car_model_id; })()}</td>
                <td className="p-2"><Badge className="bg-gray-100">{humanVehicleStatus(v.status)}</Badge></td>
                <td className="p-2">{v.arrived_at?.split("T")[0] ?? ""}</td>
                <td className="p-2 space-x-2">
                  <Button onClick={()=>api.markVehicleArrived(v.id).then(reload)} className="bg-blue-600 text-white" disabled={!can("VEHICLE.MARK_ARRIVED")}>Đánh dấu về đại lý</Button>
                  <Button onClick={()=>{ setSelected(v); setVinInput(v.vin ?? ""); setOpenVIN(true); }} disabled={!can("VEHICLE.SET_VIN")}>Gán VIN</Button>
                  <Button onClick={()=>{ setSelected(v); setOpenDeliver(true); }} className="bg-black text-white" disabled={v.status!=="AT_DEALER" || !can("DELIVERY.CREATE")}>Lập phiếu giao</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full table-auto text-sm">
          <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">VIN</th><th className="p-2">Mẫu xe</th><th className="p-2">Trạng thái</th><th className="p-2">Ngày về</th><th className="p-2">Thao tác</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="p-2" colSpan={6}>Đang tải…</td></tr> : (data ?? []).filter((v:any)=>{
              if (status && v.status !== status) return false;
              const s = (q||"").toLowerCase(); if (!s) return true;
              const model = String(v.model?.model ?? '').toLowerCase();
              return (String(v.vin ?? '').toLowerCase().includes(s) || model.includes(s));
            }).map((v: any) => (
              <tr key={v.id} className="border-t">
                <td className="p-2">#{v.id}</td>
                <td className="p-2 font-mono">{v.vin ?? <span className="text-gray-400">(chưa có)</span>}</td>
                <td className="p-2">{v.model?.model ?? v.model?.id ?? ''}</td>
                <td className="p-2">{v.status ?? ''}</td>
                <td className="p-2">{v.arrivedAt?.split('T')[0] ?? ''}</td>
                <td className="p-2 space-x-2">
                  <Button onClick={()=>api.markVehicleArrived(v.id).then(reload)} className="bg-blue-600 text-white" disabled={!can("VEHICLE.MARK_ARRIVED")}>Đánh dấu về đại lý</Button>
                  <Button onClick={()=>{ setSelected(v); setVinInput(v.vin ?? ""); setOpenVIN(true); }} disabled={!can("VEHICLE.SET_VIN")}>Gán VIN</Button>
                  <Button onClick={()=>{ setSelected(v); setOpenDeliver(true); }} className="bg-black text-white" disabled={v.status!=="AT_DEALER" || !can("DELIVERY.CREATE")}>Lập phiếu giao</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>

    {(!BACKEND_MODE ? true : true) && <>
      <Modal open={openVIN} onClose={()=>setOpenVIN(false)} title={`Gán VIN cho xe #${selected?.id}`}>
        <div className="space-y-3">
          <input className="w-full rounded-xl border p-2 font-mono" placeholder="JTXXXXXXXXXXXXXXX" value={vinInput} onChange={e=>setVinInput(e.target.value)} />
          <div className="flex justify-end gap-2"><Button onClick={()=>setOpenVIN(false)}>Hủy</Button><Button className="bg-black text-white" onClick={async()=>{ if(selected){ await api.setVehicleVIN(selected.id, vinInput); setOpenVIN(false); reload(); } }}>Lưu VIN</Button></div>
        </div>
      </Modal>

      <CreateDeliveryModal open={openDeliver} onClose={()=>setOpenDeliver(false)} vehicle={selected} api={api} onDone={reload} />
    </>}
  </div>;
}

function CreateDeliveryModal({ open, onClose, vehicle, api, onDone }: { open: boolean; onClose: ()=>void; vehicle: any | null; api: ReturnType<typeof useApi>; onDone: ()=>void; }) {
  const backend = BACKEND_MODE;
  const [form, setForm] = React.useState<any>(null);
  const { data: orders } = useReloadable((api as any).listCustomerOrders ?? api.listOrders, []);
  const { data: vouchers } = useReloadable(api.listVouchers, []);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(()=>{
    if (!form?.orderId) return;
    const o: any = (orders ?? []).find((x:any)=> x.id === form.orderId);
    if (!o) return;
    setForm((prev:any) => ({
      ...prev,
      customerName: (prev.customerName && prev.customerName.length>0) ? prev.customerName : (o.customerInfo ?? prev.customerName),
      priceBefore: (prev.priceBefore !== '' && prev.priceBefore != null) ? prev.priceBefore : (o.price ?? prev.priceBefore),
    }));
  }, [form?.orderId, orders]);
  React.useEffect(()=>{
    if (!open || !vehicle) return;
    setForm(backend
      ? { orderId: '', vehicleUnitId: vehicle.id, customerName: '', priceBefore: '', voucherCode: '' }
      : { customer_name: '', price_before: 0, voucher_id: '', deposit: 10000000 }
    );
  }, [open, vehicle, backend]);
  if(!open || !vehicle || !form) return null;

  return <Modal open={open} onClose={onClose} title={`Lập phiếu giao xe #${vehicle.id}`}>
    <div className="space-y-3">
      <div className="rounded-xl border p-3 text-sm text-gray-600">VIN: <span className="font-mono">{vehicle.vin ?? "(chưa có)"}</span> · Trạng thái: {vehicle.status}</div>
      {backend ? (
        <div className="grid grid-cols-2 gap-3">
          {err && <div className="col-span-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
          <div>
            <label className="text-xs">Đơn hàng</label>
            <select className="w-full rounded-xl border p-2" value={form.orderId} onChange={e=>setForm({...form, orderId: e.target.value? Number(e.target.value): ''})}>
              <option value="">Chọn đơn</option>
              {(orders ?? []).map((o:any)=> <option key={o.id} value={o.id}>#{o.id} – {o.username ?? o.userId ?? ''} · {o.vehicleModel ?? ''}</option>)}
            </select>
          </div>
          <input className="w-full rounded-xl border p-2 bg-gray-100" placeholder="Tên khách hàng" value={form.customerName} disabled readOnly />
          <input className="w-full rounded-xl border p-2 bg-gray-100" type="number" placeholder="Giá trước" value={form.priceBefore ?? ''} disabled readOnly />
          <div>
            <label className="text-xs">Mã voucher (nếu có)</label>
            <select className="w-full rounded-xl border p-2" value={form.voucherCode ?? ''} onChange={e=>setForm({...form, voucherCode:e.target.value})}>
              <option value="">Không áp dụng</option>
              {(vouchers ?? []).map((v:any)=> <option key={v.id} value={v.code}>{v.code} – {v.title}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full rounded-xl border p-2" placeholder="Tên khách hàng" value={form.customer_name} onChange={e=>setForm({...form, customer_name:e.target.value})} />
          <input className="w-full rounded-xl border p-2" type="number" value={form.price_before ?? 0} onChange={e=>setForm({...form, price_before:Number(e.target.value)})} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onClose}>Hủy</Button>
        <Button className="bg-black text-white" onClick={async()=>{
          try {
            setErr(null);
            if (backend) {
              const payload: any = { ...form };
              if (payload.priceBefore === '') delete payload.priceBefore;
              await api.createDelivery(payload);
            } else {
              await api.createDelivery({ vehicleUnitId: vehicle.id, customerName: form.customer_name, priceBefore: form.price_before });
            }
            onClose(); onDone();
          } catch (e:any) {
            console.error('Create delivery failed', e);
            setErr(e?.message || 'Create delivery failed');
          }
        }} disabled={backend ? (!form.orderId || !form.customerName) : (!form.customer_name)}>Tạo phiếu</Button>
      </div>
    </div>
  </Modal>;
}
