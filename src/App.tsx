
import React from "react";
import { Button, Badge } from "./components/ui";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import CustomerOrders from "./pages/CustomerOrders";
import Accounts from "./pages/Accounts";
import Guide from "./pages/Guide";
import Inventory from "./pages/Inventory";
import Vouchers from "./pages/Vouchers";
import Deliveries from "./pages/Deliveries";
import Auth from "./pages/Auth";
import type { Role } from "./lib/types";
import { ROLE_PERMS, useApi, login as backendLogin, register as backendRegister, logout as backendLogout, BACKEND_MODE, getRoleFromToken, getToken } from "./lib/api";
import { useReloadable } from "./hooks/useReloadable";

export default function App(){
  const [role, setRole] = React.useState<Role>(() => {
    const r = getRoleFromToken();
    return (r ?? 'STAFF') as Role;
  });
  const api = useApi(role);
  const can = (perm: string) => {
    // Manager full quyền
    if (role === 'MANAGER') return true;
    return ROLE_PERMS[role].includes(perm);
  };

  const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) || "";
  const backendMode = Boolean(API_BASE) || BACKEND_MODE;
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [logged, setLogged] = React.useState<string | null>(()=> getToken());
  const [authMode, setAuthMode] = React.useState<'login'|'register'>('login');
  const [name, setName] = React.useState("");
  const [roleId, setRoleId] = React.useState<number>(1);
  const [deliveryOrderId, setDeliveryOrderId] = React.useState<number | null>(null);

  React.useEffect(()=>{
    // cập nhật role theo token sau khi login/logout
    const r = getRoleFromToken();
    if (r) setRole(r as Role);
  }, [logged]);

  // Tabs chính theo luồng nghiệp vụ: Tổng quan → Đặt PO → Kho xe → Đơn khách → Phiếu giao → Voucher → Tài khoản
  const tabsAll = backendMode ? [
    { key: "dashboard", label: "Tổng quan", roles: ["MANAGER","STAFF"] },
    { key: "orders", label: "Đặt PO", roles: ["MANAGER"] },
    { key: "inventory", label: "Kho xe", roles: ["MANAGER","STAFF"] },
    { key: "customer-orders", label: "Đơn khách", roles: ["MANAGER","STAFF"] },
    { key: "deliveries", label: "Phiếu giao", roles: ["MANAGER","STAFF"] },
    { key: "vouchers", label: "Mã ưu đãi", roles: ["MANAGER"] },
    { key: "accounts", label: "Tài khoản", roles: ["MANAGER"] },
  ] as const : [
    { key: "dashboard", label: "Tổng quan", roles: ["MANAGER","STAFF"] },
    { key: "orders", label: "Đặt PO", roles: ["MANAGER"] },
    { key: "inventory", label: "Kho xe", roles: ["MANAGER","STAFF"] },
    { key: "vouchers", label: "Mã ưu đãi", roles: ["MANAGER"] },
    { key: "deliveries", label: "Phiếu giao", roles: ["MANAGER","STAFF"] },
  ] as const;
  const visible = tabsAll.filter(t => t.roles.includes(role as any));
  const [tab, setTab] = React.useState<string>(visible[0].key);
  React.useEffect(()=>{ if(!visible.find(t=>t.key===tab)) setTab(visible[0]?.key ?? "orders") }, [role, backendMode]);

  // Lightweight badges for sidebar (backend mode only)
  const isManager = role === 'MANAGER';
  const { data: deliveries } = backendMode ? useReloadable<any[]>(api.listDeliveries, [api, role]) : { data: null } as any;
  const { data: customerOrders } = backendMode ? useReloadable<any[]>((api as any).listCustomerOrders, [api, role]) : { data: null } as any;
  const { data: po } = backendMode ? useReloadable<any[]>(api.listOrders, [api, role]) : { data: null } as any;
  const pendingDeliveries = ((deliveries as any[]) ?? []).filter(d => {
    const s = String(d.status || '').toUpperCase();
    return s !== 'DELIVERED' && s !== 'COMPLETED' && s !== 'CANCELLED';
  }).length;
  const staffPendingOrders = ((customerOrders as any[]) ?? []).filter(o => String(o.status || '').toUpperCase() === 'PENDING').length;
  const poOpen = ((po as any[]) ?? []).filter(o => {
    const s = String(o.status || '').toUpperCase();
    return s === 'DRAFT' || s === 'SUBMITTED';
  }).length;

  // Gate: nếu chạy backend và chưa đăng nhập -> hiển thị màn hình Auth
  if (backendMode && !logged) {
    return <Auth onSuccess={()=> setLogged('1')} />;
  }

  return (
    <div className="bg-gray-50 flex">
      <aside className="hidden md:flex w-64 flex-col border-r bg-white px-3 py-4 h-screen sticky top-0">
        <div className="mb-3">
          <div className="text-lg font-bold">Dealer Manager</div>
          <div className="text-xs text-gray-500 mt-0.5">{backendMode? 'Backend mode' : 'Mock mode'}</div>
        </div>
        <div className="mb-3">
          {!backendMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Vai trò (mock)</span>
              <select className="rounded-xl border p-2 text-xs" value={role} onChange={e=>setRole(e.target.value as Role)}>
                <option value="MANAGER">Quản lý</option>
                <option value="STAFF">Nhân viên</option>
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-green-700 font-medium">{role === 'MANAGER' ? 'Manager' : 'Staff'}</span>
              {backendMode && (
                <span className="text-gray-500">
                  {isManager
                    ? `${poOpen} PO mở · ${pendingDeliveries} phiếu giao chờ`
                    : `${staffPendingOrders} đơn chờ · ${pendingDeliveries} phiếu giao chờ`}
                </span>
              )}
            </div>
          )}
        </div>
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {visible.map(t => (
            <Button key={t.key} onClick={()=>setTab(t.key)} variant={tab===t.key ? 'primary' : 'ghost'}>
              {t.label}
            </Button>
          ))}
        </nav>
        {backendMode && (
          <div className="pt-3 space-y-2 border-t mt-3">
            <Button onClick={()=>{ backendLogout(); setLogged(null); }} variant="secondary" className="w-full">Đăng xuất</Button>
            <Button onClick={()=>setTab("guide")} variant={tab==="guide" ? "primary" : "ghost"} className="w-full">
              Hướng dẫn
            </Button>
          </div>
        )}
      </aside>

      <div className="flex-1 p-4 md:p-6">
        <header className="mb-4 md:hidden">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold">Dealer Manager</div>
            {backendMode && <Button onClick={()=>{ backendLogout(); setLogged(null); }}>Đăng xuất</Button>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {visible.map(t => (
              <Button key={t.key} onClick={()=>setTab(t.key)} variant={tab===t.key ? 'primary' : 'ghost'}>
                {t.label}
              </Button>
            ))}
            {backendMode && (
              <Button onClick={()=>setTab("guide")} variant={tab==="guide" ? "primary" : "ghost"}>
                Hướng dẫn
              </Button>
            )}
          </div>
        </header>

        <main key={logged ? 'auth' : 'guest'} className="space-y-4">
          {tab==="dashboard" && <Dashboard api={api} role={role} />}
          {tab==="orders" && <Orders api={api} can={can} />}
          {tab==="inventory" && <Inventory api={api} can={can} />}
          {backendMode && tab==="customer-orders" && (
            <CustomerOrders
              api={api}
              can={can}
              onCreateDelivery={(orderId) => {
                setDeliveryOrderId(orderId);
                setTab("deliveries");
              }}
            />
          )}
          {tab==="vouchers" && <Vouchers api={api} can={can} />}
          {backendMode && tab==="accounts" && <Accounts api={api} />}
          {tab==="deliveries" && (
            <Deliveries
              api={api}
              can={can}
              initialOrderId={deliveryOrderId}
              onInitialOrderHandled={()=> setDeliveryOrderId(null)}
            />
          )}
          {tab==="guide" && <Guide />}
        </main>
      </div>
    </div>
  );
}
