
import React from "react";
import { Button } from "./components/ui";
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

  React.useEffect(()=>{
    // cập nhật role theo token sau khi login/logout
    const r = getRoleFromToken();
    if (r) setRole(r as Role);
  }, [logged]);

  const tabsAll = backendMode ? [
    { key: "dashboard", label: "Tổng quan", roles: ["MANAGER","STAFF"] },
    { key: "orders", label: "Đặt PO", roles: ["MANAGER"] },
    { key: "customer-orders", label: "Đơn khách", roles: ["MANAGER","STAFF"] },
    { key: "inventory", label: "Kho xe", roles: ["MANAGER","STAFF"] },
    { key: "vouchers", label: "Mã ưu đãi", roles: ["MANAGER"] },
    { key: "accounts", label: "Tài khoản", roles: ["MANAGER"] },
    { key: "deliveries", label: "Phiếu giao", roles: ["MANAGER","STAFF"] },
    { key: "guide", label: "Hướng dẫn", roles: ["MANAGER","STAFF"] },
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

  // Gate: nếu chạy backend và chưa đăng nhập -> hiển thị màn hình Auth
  if (backendMode && !logged) {
    return <Auth onSuccess={()=> setLogged('1')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex w-64 flex-col border-r bg-white p-4">
        <div className="mb-4">
          <div className="text-lg font-bold">Dealer Manager</div>
          <div className="text-xs text-gray-500 mt-0.5">{backendMode? 'Backend mode' : 'Mock mode'}</div>
        </div>
        <div className="mb-4">
          {!backendMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Vai trò (mock)</span>
              <select className="rounded-xl border p-2 text-xs" value={role} onChange={e=>setRole(e.target.value as Role)}>
                <option value="MANAGER">Quản lý</option>
                <option value="STAFF">Nhân viên</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-700">{role === 'MANAGER' ? 'Manager' : 'Staff'}</span>
            </div>
          )}
        </div>
        <nav className="flex flex-col gap-1">
          {visible.map(t => (
            <Button key={t.key} onClick={()=>setTab(t.key)} variant={tab===t.key ? 'primary' : 'ghost'}>
              {t.label}
            </Button>
          ))}
        </nav>
        {backendMode && (
          <div className="mt-auto pt-4">
            <Button onClick={()=>{ backendLogout(); setLogged(null); }} variant="secondary" className="w-full">Đăng xuất</Button>
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
          </div>
        </header>

        <main key={logged ? 'auth' : 'guest'} className="space-y-4">
          {tab==="dashboard" && <Dashboard api={api} role={role} />}
          {tab==="orders" && <Orders api={api} can={can} />}
          {tab==="inventory" && <Inventory api={api} can={can} />}
          {backendMode && tab==="customer-orders" && <CustomerOrders api={api} can={can} />}
          {tab==="vouchers" && <Vouchers api={api} can={can} />}
          {backendMode && tab==="accounts" && <Accounts api={api} />}
          {tab==="deliveries" && <Deliveries api={api} can={can} />}
          {tab==="guide" && <Guide />}
        </main>
      </div>
    </div>
  );
}
