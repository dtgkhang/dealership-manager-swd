
import React from "react";
import { Button } from "./components/ui";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import CustomerOrders from "./pages/CustomerOrders";
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
    { key: "orders", label: "Đơn hàng", roles: ["MANAGER","STAFF"] },
    { key: "customer-orders", label: "Đơn khách", roles: ["MANAGER","STAFF"] },
    { key: "inventory", label: "Kho xe", roles: ["MANAGER","STAFF"] },
    { key: "vouchers", label: "Mã ưu đãi", roles: ["MANAGER"] },
    { key: "deliveries", label: "Phiếu giao", roles: ["MANAGER","STAFF"] },
  ] as const : [
    { key: "dashboard", label: "Tổng quan", roles: ["MANAGER","STAFF"] },
    { key: "orders", label: "PO từ hãng", roles: ["MANAGER"] },
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

  return <div className="min-h-screen bg-gray-50">
    <div className="mx-auto max-w-6xl px-4 py-4">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xl font-bold">Quản lý đại lý xe <span className="text-xs text-gray-500">({backendMode? 'Backend mode' : 'Mock mode'})</span></div>
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">
          {!backendMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Vai trò (mock):</span>
              <select className="rounded-xl border p-2" value={role} onChange={e=>setRole(e.target.value as Role)}>
                <option value="MANAGER">Quản lý</option>
                <option value="STAFF">Nhân viên</option>
              </select>
            </div>
          )}
          {backendMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-700">{role === 'MANAGER' ? 'Manager' : 'Staff'}</span>
              <Button onClick={()=>{ backendLogout(); setLogged(null); }}>Đăng xuất</Button>
            </div>
          )}
        </div>
        <nav className="flex flex-wrap gap-2">
          {visible.map(t => <Button key={t.key} onClick={()=>setTab(t.key)} className={tab===t.key ? "bg-black text-white" : "bg-white"}>{t.label}</Button>)}
        </nav>
      </header>

      <main key={logged ? 'auth' : 'guest'} className="space-y-4">
        {!backendMode && tab==="dashboard" && <Dashboard api={api} />}
        {tab==="orders" && <Orders api={api} can={can} />}
        {tab==="inventory" && <Inventory api={api} can={can} />}
        {backendMode && tab==="customer-orders" && <CustomerOrders api={api} can={can} />}
        {tab==="vouchers" && <Vouchers api={api} can={can} />}
        {tab==="deliveries" && <Deliveries api={api} can={can} />}
      </main>
    </div>
  </div>;
}
