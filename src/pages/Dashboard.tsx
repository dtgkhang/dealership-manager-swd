import React from "react";
import { Card } from "../components/ui";
import type { VehicleStatus } from "../lib/types";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";

export default function Dashboard({ api }: { api: ReturnType<typeof useApi> }) {
  const { data: vehicles } = useReloadable(api.listVehicles, []);
  const { data: deliveries } = useReloadable(api.listDeliveries, []);
  const { data: orders } = useReloadable(api.listOrders, []);
  const count = (s: VehicleStatus) => (vehicles ?? []).filter(v => v.status === s).length;
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
    <Card><div className="text-2xl font-bold">{count("ON_ORDER")}</div><div className="text-xs text-gray-500">Đang đặt</div></Card>
    <Card><div className="text-2xl font-bold">{count("AT_DEALER")}</div><div className="text-xs text-gray-500">Tại đại lý</div></Card>
    <Card><div className="text-2xl font-bold">{count("DELIVERED")}</div><div className="text-xs text-gray-500">Đã giao</div></Card>
    <Card><div className="text-2xl font-bold">{(deliveries ?? []).length}</div><div className="text-xs text-gray-500">Phiếu giao</div></Card>
    <Card><div className="text-2xl font-bold">{(orders ?? []).length}</div><div className="text-xs text-gray-500">PO</div></Card>
  </div>;
}

