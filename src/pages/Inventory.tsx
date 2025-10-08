import React from "react";
import { Badge, Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import type { VehicleUnit } from "../lib/types";
import { humanVehicleStatus, currency } from "../lib/utils";
import { useApi } from "../lib/api";

export default function Inventory({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, reload } = useReloadable(api.listVehicles, []);
  const { data: models } = useReloadable(api.listModels, []);
  const modelById = React.useMemo(()=> new Map((models ?? []).map(m => [m.id, m])), [models]);
  const [vinInput, setVinInput] = React.useState(""); const [selected, setSelected] = React.useState<VehicleUnit | null>(null);
  const [openVIN, setOpenVIN] = React.useState(false); const [openDeliver, setOpenDeliver] = React.useState(false);

  return <div className="space-y-4">
    <h2 className="text-lg font-semibold">Kho xe tại đại lý</h2>
    <Card>
      <table className="w-full table-auto text-sm">
        <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">VIN</th><th className="p-2">Dòng xe</th><th className="p-2">Trạng thái</th><th className="p-2">Ngày về</th><th className="p-2">Thao tác</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={6}>Đang tải…</td></tr> : (data ?? []).map(v => (
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
    </Card>

    <Modal open={openVIN} onClose={()=>setOpenVIN(false)} title={`Gán VIN cho xe #${selected?.id}`}>
      <div className="space-y-3">
        <input className="w-full rounded-xl border p-2 font-mono" placeholder="JTXXXXXXXXXXXXXXX" value={vinInput} onChange={e=>setVinInput(e.target.value)} />
        <div className="flex justify-end gap-2"><Button onClick={()=>setOpenVIN(false)}>Hủy</Button><Button className="bg-black text-white" onClick={async()=>{ if(selected){ await api.setVehicleVIN(selected.id, vinInput); setOpenVIN(false); } }}>Lưu VIN</Button></div>
      </div>
    </Modal>

    <CreateDeliveryModal open={openDeliver} onClose={()=>setOpenDeliver(false)} vehicle={selected} api={api} onDone={reload} />
  </div>;
}

function CreateDeliveryModal({ open, onClose, vehicle, api, onDone }: { open: boolean; onClose: ()=>void; vehicle: VehicleUnit | null; api: ReturnType<typeof useApi>; onDone: ()=>void; }) {
  const { data: models } = useReloadable(api.listModels, []);
  const { data: vouchers } = useReloadable(api.listVouchers, []);
  const model = React.useMemo(()=> models?.find(m => m.id === vehicle?.car_model_id), [models, vehicle]);
  const [form, setForm] = React.useState<{ customer_name: string; price_before?: number; voucher_id?: number | ""; deposit?: number } | null>(null);
  React.useEffect(()=>{ if(vehicle && model) setForm({ customer_name: "", price_before: model.msrp, voucher_id: "", deposit: 10_000_000 }); }, [vehicle, model]);
  if(!open || !vehicle || !form) return null;

  const selectedVoucher = vouchers?.find(v => v.id === (typeof form.voucher_id === "number" ? form.voucher_id : undefined));
  const discount = selectedVoucher ? api.computeVoucherDiscount(selectedVoucher as any, form.price_before) : 0;
  const priceAfter = Math.max(0, (form.price_before ?? 0) - discount);

  return <Modal open={open} onClose={onClose} title={`Lập phiếu giao xe #${vehicle.id}`}>
    <div className="space-y-3">
      <div className="rounded-xl border p-3 text-sm text-gray-600">Xe: {model ? `${model.brand} ${model.model} ${model.variant ?? ""}` : vehicle.car_model_id} · VIN: <span className="font-mono">{vehicle.vin ?? "(chưa có)"}</span></div>
      <div className="grid grid-cols-2 gap-3">
        <input className="w-full rounded-xl border p-2" placeholder="Tên khách hàng" value={form.customer_name} onChange={e=>setForm({...form, customer_name:e.target.value})} />
        <select className="w-full rounded-xl border p-2" value={form.voucher_id ?? ""} onChange={e=>setForm({...form, voucher_id: e.target.value ? Number(e.target.value) : ""})}>
          <option value="">(Không áp dụng)</option>
          {(vouchers ?? []).map(v => <option key={v.id} value={v.id}>{v.code} – {v.title}</option>)}
        </select>
        <input className="w-full rounded-xl border p-2" type="number" value={form.price_before ?? 0} onChange={e=>setForm({...form, price_before:Number(e.target.value)})} />
        <input className="w-full rounded-xl border p-2" type="number" value={form.deposit ?? 0} onChange={e=>setForm({...form, deposit:Number(e.target.value)})} />
      </div>
      <Card>
        <div className="flex items-center justify-between text-sm"><div>Ưu đãi áp dụng</div><div className="font-semibold">{currency(discount)}</div></div>
        <div className="mt-1 flex items-center justify-between text-sm"><div>Giá sau ưu đãi</div><div className="font-semibold">{currency(priceAfter)}</div></div>
      </Card>
      <div className="flex justify-end gap-2"><Button onClick={onClose}>Hủy</Button><Button className="bg-black text-white" onClick={async()=>{ await api.createDelivery({ vehicle_id: vehicle.id, customer_name: form.customer_name, price_before: form.price_before, voucher_id: typeof form.voucher_id==="number" ? form.voucher_id : undefined, price_after: priceAfter, deposit: form.deposit }); onClose(); onDone(); }} disabled={!form.customer_name}>Tạo phiếu</Button></div>
    </div>
  </Modal>;
}
