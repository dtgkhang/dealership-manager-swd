import React from "react";
import { Badge, Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import type { VehicleUnit } from "../lib/types";
import { humanVehicleStatus, currency } from "../lib/utils";
import { useApi, BACKEND_MODE } from "../lib/api";
//

export default function Inventory({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, error, reload } = useReloadable<any[]>(api.listVehicles, []);
  const { data: models } = useReloadable<any[]>(api.listModels, []);
  const modelById = React.useMemo(()=> new Map(((models ?? []) as any[]).map((m: any) => [m.id, m])), [models]);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<string|"">("");
  const [vinInput, setVinInput] = React.useState(""); const [selected, setSelected] = React.useState<VehicleUnit | any | null>(null);
  const [openVIN, setOpenVIN] = React.useState(false); const [openDeliver, setOpenDeliver] = React.useState(false);
  const [vinErr, setVinErr] = React.useState<string | null>(null);

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
            {loading ? <tr><td className="p-2" colSpan={6}>Đang tải…</td></tr> : ((data as any[]) ?? []).filter((v:any)=>{
              if (status && v.status !== status) return false;
              const s = (q||"").toLowerCase(); if (!s) return true;
              const model = (()=>{ const m: any = modelById.get(v.car_model_id); return m ? `${m.brand} ${m.model} ${m.variant ?? ""}` : v.model?.model ?? ''; })().toLowerCase();
              return (String(v.vin ?? '').toLowerCase().includes(s) || model.includes(s));
            }).map((v: any) => (
              <tr key={v.id} className="border-t">
                <td className="p-2">#{v.id}</td>
                <td className="p-2 font-mono">{v.vin ?? <span className="text-gray-400">(chưa có)</span>}</td>
                <td className="p-2">{(()=>{ const m: any = modelById.get(v.car_model_id); return m ? `${m.brand} ${m.model} ${m.variant ?? ""}` : v.car_model_id; })()}</td>
                <td className="p-2">{renderStatus(v.status)}</td>
                <td className="p-2">{v.arrived_at?.split("T")[0] ?? ""}</td>
                <td className="p-2 space-x-2">
                  <Button variant="info" onClick={()=>api.markVehicleArrived(v.id).then(reload)} disabled={!can("VEHICLE.MARK_ARRIVED")}>Đánh dấu về đại lý</Button>
                  <Button onClick={()=>{ setSelected(v); setVinInput(v.vin ?? ""); setOpenVIN(true); }} disabled={!can("VEHICLE.SET_VIN")}>Gán VIN</Button>
                  <Button variant="primary" onClick={()=>{ setSelected(v); setOpenDeliver(true); }} disabled={v.status!=="AT_DEALER" || !can("DELIVERY.CREATE")}>Lập phiếu giao</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full table-auto text-sm">
          <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">VIN</th><th className="p-2">Mẫu xe</th><th className="p-2">Trạng thái</th><th className="p-2">Ngày về</th><th className="p-2">Thao tác</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="p-2" colSpan={6}>Đang tải…</td></tr> : ((data as any[]) ?? []).filter((v:any)=>{
              if (status && v.status !== status) return false;
              const s = (q||"").toLowerCase(); if (!s) return true;
              const model = String(v.model?.model ?? '').toLowerCase();
              return (String(v.vin ?? '').toLowerCase().includes(s) || model.includes(s));
            }).map((v: any) => (
              <tr key={v.id} className="border-t">
                <td className="p-2">#{v.id}</td>
                <td className="p-2 font-mono">{v.vin ?? <span className="text-gray-400">(chưa có)</span>}</td>
                <td className="p-2">{v.model?.model ?? v.model?.id ?? ''}</td>
                <td className="p-2">{renderStatus(v.status)}</td>
                <td className="p-2">{v.arrivedAt?.split('T')[0] ?? ''}</td>
                <td className="p-2 space-x-2">
                  <Button variant="info" onClick={()=>api.markVehicleArrived(v.id).then(reload)} disabled={!can("VEHICLE.MARK_ARRIVED")}>Đánh dấu về đại lý</Button>
                  <Button onClick={()=>{ setSelected(v); setVinInput(v.vin ?? ""); setOpenVIN(true); }} disabled={!can("VEHICLE.SET_VIN")}>Gán VIN</Button>
                  <Button variant="primary" onClick={()=>{ setSelected(v); setOpenDeliver(true); }} disabled={v.status!=="AT_DEALER" || !can("DELIVERY.CREATE")}>Lập phiếu giao</Button>
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
          {vinErr && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{vinErr}</div>}
          <input className="w-full rounded-xl border p-2 font-mono" placeholder="JTXXXXXXXXXXXXXXX" value={vinInput} onChange={e=>setVinInput(e.target.value.toUpperCase())} />
          <div className="flex justify-end gap-2"><Button onClick={()=>setOpenVIN(false)}>Hủy</Button><Button variant="primary" onClick={async()=>{
            try {
              setVinErr(null);
              if (!selected) return;
              const vin = (vinInput || '').trim().toUpperCase();
              const ok = /^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin);
              if (!ok) { setVinErr('VIN không hợp lệ (chỉ A-HJ-NPR-Z và số, 11-17 ký tự)'); return; }
              await api.setVehicleVIN(selected.id, vin);
              setOpenVIN(false); reload();
            } catch (e:any) { setVinErr(e?.message || 'Gán VIN thất bại'); }
          }}>Lưu VIN</Button></div>
        </div>
      </Modal>

      <CreateDeliveryModal open={openDeliver} onClose={()=>setOpenDeliver(false)} vehicle={selected} api={api} onDone={reload} />
    </>}
  </div>;
}

function CreateDeliveryModal({ open, onClose, vehicle, api, onDone }: { open: boolean; onClose: ()=>void; vehicle: any | null; api: ReturnType<typeof useApi>; onDone: ()=>void; }) {
  const backend = BACKEND_MODE;
  const [form, setForm] = React.useState<any>(null);
  const { data: orders } = useReloadable<any[]>((api as any).listCustomerOrders ?? api.listOrders, []);
  const { data: vouchers } = useReloadable<any[]>(api.listVouchers, []);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(()=>{
    if (!form?.orderId) return;
    const ordersArr = (orders as any[]) ?? [];
    const o: any = ordersArr.find((x:any)=> x.id === form.orderId);
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
              {((orders as any[]) ?? []).filter((o:any)=> { const s=String(o.status||'').toUpperCase(); return s!=='COMPLETED' && s!=='DELIVERED' && s!=='CANCELLED'; }).map((o:any)=> <option key={o.id} value={o.id}>#{o.id} – {o.username ?? o.userId ?? ''} · {o.vehicleModel ?? ''}</option>)}
            </select>
          </div>
          <input className="w-full rounded-xl border p-2 bg-gray-100" placeholder="Tên khách hàng" value={form.customerName} disabled readOnly />
          <input className="w-full rounded-xl border p-2 bg-gray-100" type="number" placeholder="Giá trước" value={form.priceBefore ?? ''} disabled readOnly />
          <div>
            <label className="text-xs">Mã voucher (nếu có)</label>
            <select className="w-full rounded-xl border p-2" value={form.voucherCode ?? ''} onChange={e=>setForm({...form, voucherCode:e.target.value})}>
              <option value="">Không áp dụng</option>
              {((vouchers as any[]) ?? []).map((v:any)=> <option key={v.id} value={v.code}>{v.code} – {v.title}</option>)}
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

function renderStatus(status?: string){
  const s = (status ?? '').toUpperCase();
  if (s === 'AT_DEALER') return <Badge className="bg-blue-50 text-blue-700">{humanVehicleStatus(status as any)}</Badge>;
  if (s === 'DELIVERED') return <Badge className="bg-green-50 text-green-700">{humanVehicleStatus(status as any)}</Badge>;
  return <Badge className="bg-gray-100 text-gray-700">{humanVehicleStatus(status as any)}</Badge>;
}
