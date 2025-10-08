import React from "react";
import { Button, Card } from "../components/ui";
import { currency, humanDeliveryStatus } from "../lib/utils";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";

export default function Deliveries({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, reload } = useReloadable(api.listDeliveries, []);
  const { data: vehicles } = useReloadable(api.listVehicles, []);
  const vehMap = React.useMemo(()=> new Map((vehicles ?? []).map(v=>[v.id, v])), [vehicles]);
  return <div className="space-y-4">
    <h2 className="text-lg font-semibold">Phiếu giao xe</h2>
    <Card>
      <table className="w-full table-auto text-sm">
        <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">Xe (VIN)</th><th className="p-2">Khách hàng</th><th className="p-2">Giá trước</th><th className="p-2">Giảm</th><th className="p-2">Giá sau</th><th className="p-2">Trạng thái</th><th className="p-2">Thao tác</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={8}>Đang tải…</td></tr> : (data ?? []).map(d => (
            <tr key={d.id} className="border-t">
              <td className="p-2">#{d.id}</td>
              <td className="p-2 font-mono">{vehMap.get(d.vehicle_id)?.vin ?? `#${d.vehicle_id}`}</td>
              <td className="p-2">{d.customer_name}</td>
              <td className="p-2">{currency(d.price_before)}</td>
              <td className="p-2">{currency(d.discount_applied)}</td>
              <td className="p-2 font-semibold">{currency(d.price_after)}</td>
              <td className="p-2">{humanDeliveryStatus(d.status)}</td>
              <td className="p-2">
                {d.status!=="COMPLETED" && <Button className="bg-green-600 text-white" onClick={()=>api.completeDelivery(d.id).then(reload)} disabled={!can("DELIVERY.COMPLETE")}>Hoàn tất</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>;
}

