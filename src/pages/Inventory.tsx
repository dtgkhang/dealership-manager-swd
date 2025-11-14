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
  const [openVIN, setOpenVIN] = React.useState(false);
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
      {(() => {
        const rows: any[] = ((data as any[]) ?? []);
        const total = rows.length;
        const onOrder = rows.filter((v:any)=> String(v.status||'').toUpperCase()==='ON_ORDER').length;
        const atDealer = rows.filter((v:any)=> String(v.status||'').toUpperCase()==='AT_DEALER').length;
        const delivered = rows.filter((v:any)=> String(v.status||'').toUpperCase()==='DELIVERED').length;
        return <div className="flex flex-wrap items-center gap-6 text-sm">
          <div><span className="text-gray-600">Tổng xe:</span> <span className="font-semibold">{total}</span></div>
          <div><span className="text-gray-600">ON_ORDER:</span> <span className="font-semibold">{onOrder}</span></div>
          <div><span className="text-gray-600">AT_DEALER:</span> <span className="font-semibold">{atDealer}</span></div>
          <div><span className="text-gray-600">DELIVERED:</span> <span className="font-semibold">{delivered}</span></div>
        </div>;
      })()}
    </Card>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      {!BACKEND_MODE ? (
        <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-xs md:text-sm">
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
                  <Button variant="info" onClick={()=>api.markVehicleArrived(v.id).then(reload)} disabled={v.status!=="ON_ORDER" || !can("VEHICLE.MARK_ARRIVED")}>Đánh dấu về đại lý</Button>
                  <Button onClick={()=>{ setSelected(v); setVinInput(v.vin ?? ""); setOpenVIN(true); }} disabled={!can("VEHICLE.SET_VIN")}>Gán VIN</Button>
                  {/* Bỏ lập phiếu giao tại kho xe */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="min-w-full table-auto text-xs md:text-sm">
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
                  <Button variant="info" onClick={()=>api.markVehicleArrived(v.id).then(reload)} disabled={v.status!=="ON_ORDER" || !can("VEHICLE.MARK_ARRIVED")}>Đánh dấu về đại lý</Button>
                  <Button onClick={()=>{ setSelected(v); setVinInput(v.vin ?? ""); setOpenVIN(true); }} disabled={!can("VEHICLE.SET_VIN")}>Gán VIN</Button>
                  {/* Bỏ lập phiếu giao tại kho xe */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </Card>

    {(!BACKEND_MODE ? true : true) && <>
      <Modal open={openVIN} onClose={()=>setOpenVIN(false)} title={`Gán VIN cho xe #${selected?.id}`}>
        <div className="space-y-3">
          {vinErr && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{vinErr}</div>}
          <input className="w-full rounded-xl border p-2 font-mono" placeholder="JTXXXXXXXXXXXXXXX" value={vinInput} onChange={e=>setVinInput(e.target.value)} />
          <div className="flex flex-wrap justify-end gap-2"><Button onClick={()=>setOpenVIN(false)}>Hủy</Button><Button variant="primary" onClick={async()=>{
            try {
              setVinErr(null);
              if (!selected) return;
              // Nới lỏng: chấp nhận VIN 8–17 ký tự, chữ/số; tự loại ký tự khác và upper-case
              const cleaned = (vinInput || '').toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
              if (cleaned.length < 8 || cleaned.length > 17 || /[^A-Z0-9]/.test(cleaned)) {
                setVinErr('VIN không hợp lệ (8–17 ký tự chữ/số)');
                return;
              }
              await api.setVehicleVIN(selected.id, cleaned);
              setOpenVIN(false); reload();
            } catch (e:any) { setVinErr(e?.message || 'Gán VIN thất bại'); }
          }}>Lưu VIN</Button></div>
        </div>
      </Modal>

      {/* Bỏ modal lập phiếu giao tại kho xe */}
    </>}
  </div>;
}

function renderStatus(status?: string){
  const s = (status ?? '').toUpperCase();
  if (s === 'AT_DEALER') return <Badge className="bg-blue-50 text-blue-700">{humanVehicleStatus(status as any)}</Badge>;
  if (s === 'DELIVERED') return <Badge className="bg-green-50 text-green-700">{humanVehicleStatus(status as any)}</Badge>;
  return <Badge className="bg-gray-100 text-gray-700">{humanVehicleStatus(status as any)}</Badge>;
}
