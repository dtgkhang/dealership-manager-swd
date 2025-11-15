import React from "react";
import { Card, StatCard, Button } from "../components/ui";
import { SimpleDonut, SimpleBar } from "../components/charts";
import type { VehicleStatus } from "../lib/types";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";

export default function Dashboard({ api, role, onNavigate }: { api: ReturnType<typeof useApi>, role?: 'MANAGER' | 'STAFF' | null; onNavigate?: (tab: string) => void }) {
  const { data: vehicles } = useReloadable(api.listVehicles, []);
  const { data: deliveries } = useReloadable(api.listDeliveries, []);
  const { data: po } = useReloadable<any[]>(api.listOrders, []);
  const { data: customerOrders } = useReloadable<any[]>((api as any).listCustomerOrders, []);
  const { data: vouchers } = useReloadable(() => (api as any).listVouchers ? (api as any).listVouchers(false) : Promise.resolve([]), []);
  const isManager = role === 'MANAGER';
  const count = (s: VehicleStatus) => ((vehicles as any[]) ?? []).filter(v => v.status === s).length;
  const pendingDeliveries = ((deliveries as any[]) ?? []).filter(d => (d.status ?? '').toUpperCase() !== 'DELIVERED' && (d.status ?? '').toUpperCase() !== 'COMPLETED' && (d.status ?? '').toUpperCase() !== 'CANCELLED').length;

  const poRows: any[] = ((po as any[]) ?? []);
  const poByStatus = ['DRAFT','SUBMITTED','CONFIRMED','CANCELLED'].map(st => ({ label: st, value: poRows.filter(o => o.status === st).length }));
  const vehBars = [count('ON_ORDER'), count('AT_DEALER'), count('DELIVERED')];
  const deliveredRows: any[] = ((deliveries as any[]) ?? []).filter(d => { const s=String(d.status||'').toUpperCase(); return s==='DELIVERED' || s==='COMPLETED'; });
  const revenue = deliveredRows.reduce((sum, d:any)=> sum + Number(d.priceAfter || 0), 0);
  // last 7 days revenue series
  const days: string[] = Array.from({length:7}).map((_,i)=>{
    const dt = new Date(); dt.setDate(dt.getDate() - (6 - i)); return dt.toISOString().slice(0,10);
  });
  const revenueByDay = days.map(d => deliveredRows.filter(x => String(x.deliveryDate||'').slice(0,10)===d).reduce((s, x:any)=> s + Number(x.priceAfter||0), 0));
  const revenue7d = revenueByDay.reduce((s, v) => s + v, 0);

  const poOpen = poRows.filter(o => {
    const st = String(o.status || '').toUpperCase();
    return st === 'DRAFT' || st === 'SUBMITTED';
  });
  const poOverdue = poRows.filter(o => {
    const st = String(o.status || '').toUpperCase();
    if (st === 'CONFIRMED' || st === 'CANCELLED') return false;
    const etaISO = String(o.etaAtDealer ?? o.eta_at_dealer ?? '');
    if (!etaISO) return false;
    const eta = new Date(etaISO);
    if (isNaN(eta.getTime())) return false;
    const now = new Date();
    const e = new Date(eta.getFullYear(), eta.getMonth(), eta.getDate());
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return e < t;
  });

  const customerRows: any[] = ((customerOrders as any[]) ?? []);
  const staffPendingOrders = customerRows.filter(o => String(o.status || '').toUpperCase() === 'PENDING').length;
  const customerByStatus = ['PENDING','COMPLETED','CANCELLED'].map(st => ({
    label: st,
    value: customerRows.filter(o => String(o.status || '').toUpperCase() === st).length,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isManager ? (
          <>
            <StatCard label="PO đang mở" value={poOpen.length} />
            <StatCard label="PO trễ ETA" value={poOverdue.length} />
            <StatCard label="Phiếu giao chờ" value={pendingDeliveries} />
            <StatCard label="Doanh thu 7 ngày" value={new Intl.NumberFormat('vi-VN').format(revenue7d)} hint="đã giao" />
          </>
        ) : (
          <>
            <StatCard label="Đơn khách đang chờ" value={staffPendingOrders} />
            <StatCard label="Phiếu giao chờ" value={pendingDeliveries} />
            <StatCard label="Xe tại đại lý" value={count("AT_DEALER")} />
            <StatCard label="Doanh thu 7 ngày" value={new Intl.NumberFormat('vi-VN').format(revenue7d)} hint="đã giao" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isManager ? (
          <Card
            title="PO theo trạng thái"
            actions={onNavigate ? <Button className="px-2 py-1 text-xs" variant="secondary" onClick={()=>onNavigate("orders")}>Xem PO</Button> : undefined}
          >
            <div className="flex items-center gap-6">
              <SimpleDonut data={poByStatus} />
              <div className="space-y-1 text-sm">
                {poByStatus.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ["#111827","#2563eb","#16a34a","#f59e0b"][i%4] }} />
                    <span className="text-gray-600 w-24">{d.label}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card
            title="Đơn khách theo trạng thái"
            actions={onNavigate ? <Button className="px-2 py-1 text-xs" variant="secondary" onClick={()=>onNavigate("customer-orders")}>Xem đơn khách</Button> : undefined}
          >
            <div className="flex items-center gap-6">
              <SimpleDonut data={customerByStatus} />
              <div className="space-y-1 text-sm">
                {customerByStatus.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ["#2563eb","#16a34a","#ef4444"][i%3] }} />
                    <span className="text-gray-600 w-28">{d.label}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card
          title="Tồn kho theo trạng thái"
          actions={onNavigate ? <Button className="px-2 py-1 text-xs" variant="secondary" onClick={()=>onNavigate("inventory")}>Xem kho xe</Button> : undefined}
        >
          <div className="flex items-end justify-between">
            <SimpleBar data={vehBars} />
            <div className="space-y-1 text-sm text-right">
              <div className="text-gray-600">ON_ORDER: <span className="font-medium">{vehBars[0]}</span></div>
              <div className="text-gray-600">AT_DEALER: <span className="font-medium">{vehBars[1]}</span></div>
              <div className="text-gray-600">DELIVERED: <span className="font-medium">{vehBars[2]}</span></div>
            </div>
          </div>
        </Card>

        <Card
          title="Doanh thu 7 ngày"
          actions={onNavigate ? (
            <Button
              className="px-2 py-1 text-xs"
              variant="secondary"
              onClick={()=>onNavigate(isManager ? "deliveries" : "customer-orders")}
            >
              {isManager ? "Xem phiếu giao" : "Xem đơn khách"}
            </Button>
          ) : undefined}
        >
          <div className="flex items-end justify-between">
            <SimpleBar data={revenueByDay} color="#16a34a" />
            <div className="space-y-1 text-sm text-right">
              {days.map((d,i)=> <div key={i} className="text-gray-600">{d}: <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(revenueByDay[i])}</span></div>)}
            </div>
          </div>
        </Card>
      </div>

      <RecentSection
        role={role}
        deliveries={deliveries as any[]}
        po={po as any[]}
        customerOrders={customerOrders as any[]}
      />

      {role === 'MANAGER' && (
        <Card title="Việc cần làm cho quản lý">
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li>{poOpen.length} PO đang ở trạng thái DRAFT/SUBMITTED</li>
            <li>{poOverdue.length} PO đã quá ETA nhưng chưa CONFIRMED/CANCELLED</li>
            <li>{pendingDeliveries} phiếu giao đang chờ hoàn tất</li>
            <li>{count('AT_DEALER')} xe tại đại lý (có thể phân bổ cho đơn khách)</li>
          </ul>
        </Card>
      )}

      {role === 'STAFF' && (
        <Card title="Việc cần làm">
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li>{staffPendingOrders} đơn khách đang chờ xử lý</li>
            <li>{pendingDeliveries} phiếu giao đang chờ hoàn tất</li>
            <li>{count('AT_DEALER')} xe tại đại lý (có thể lập phiếu)</li>
          </ul>
        </Card>
      )}
    </div>
  );
}

function RecentSection({ deliveries, po, customerOrders, role }: { deliveries: any[]; po: any[]; customerOrders: any[]; role?: 'MANAGER' | 'STAFF' | null }) {
  const latestDeliveries = (deliveries ?? []).slice(-5).reverse();
  const latestPO = (po ?? []).slice(-5).reverse();
  const latestCustomerOrders = (customerOrders ?? []).slice(-5).reverse();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card title="Phiếu giao gần đây">
        <table className="w-full table-fixed text-sm">
          <thead><tr className="text-left text-gray-600"><th className="w-16 p-2">ID</th><th className="p-2">Trạng thái</th><th className="p-2">Ngày</th></tr></thead>
          <tbody>
            {latestDeliveries.length === 0 ? <tr><td className="p-2 text-gray-500" colSpan={3}>Chưa có phiếu giao</td></tr> : latestDeliveries.map((d:any)=>(
              <tr key={d.id} className="border-t">
                <td className="p-2">#{d.id}</td>
                <td className="p-2">{d.status}</td>
                <td className="p-2">{d.deliveryDate?.split('T')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {role === 'MANAGER' ? (
        <Card title="PO gần đây">
          <table className="w-full table-fixed text-sm">
            <thead><tr className="text-left text-gray-600"><th className="w-24 p-2">Số PO</th><th className="p-2">Trạng thái</th><th className="p-2">ETA</th></tr></thead>
            <tbody>
              {latestPO.length === 0 ? <tr><td className="p-2 text-gray-500" colSpan={3}>Chưa có PO</td></tr> : latestPO.map((o:any)=>(
                <tr key={o.id} className="border-t">
                  <td className="p-2">{o.orderNo ?? o.order_no ?? `#${o.id}`}</td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2">{(o.etaAtDealer ?? o.eta_at_dealer ?? '').toString().split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card title="Đơn khách gần đây">
          <table className="w-full table-fixed text-sm">
            <thead><tr className="text-left text-gray-600"><th className="w-16 p-2">ID</th><th className="p-2">Khách hàng</th><th className="p-2">Trạng thái</th><th className="p-2">Giá sau KM</th></tr></thead>
            <tbody>
              {latestCustomerOrders.length === 0 ? <tr><td className="p-2 text-gray-500" colSpan={4}>Chưa có đơn khách</td></tr> : latestCustomerOrders.map((o:any)=>(
                <tr key={o.id} className="border-t">
                  <td className="p-2">#{o.id}</td>
                  <td className="p-2">{o.customerInfo ?? ''}</td>
                  <td className="p-2">{o.status ?? ''}</td>
                  <td className="p-2">{new Intl.NumberFormat('vi-VN').format(Number(o.priceAfter || o.price || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
