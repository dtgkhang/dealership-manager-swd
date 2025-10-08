
import React from "react";
import { Button } from "./components/ui";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Vouchers from "./pages/Vouchers";
import Deliveries from "./pages/Deliveries";
import type { Role } from "./lib/types";
import { ROLE_PERMS, useApi } from "./lib/api";

export default function App(){
  const [role, setRole] = React.useState<Role>("STAFF");
  const api = useApi(role);
  const can = (perm: string) => ROLE_PERMS[role].includes(perm);

  const tabs = [
    { key: "dashboard", label: "Tổng quan", roles: ["MANAGER","STAFF"] },
    { key: "orders", label: "PO từ hãng", roles: ["MANAGER"] },
    { key: "inventory", label: "Kho xe", roles: ["MANAGER","STAFF"] },
    { key: "vouchers", label: "Mã ưu đãi", roles: ["MANAGER"] },
    { key: "deliveries", label: "Phiếu giao", roles: ["MANAGER","STAFF"] },
  ] as const;
  const visible = tabs.filter(t => t.roles.includes(role as any));
  const [tab, setTab] = React.useState<string>(visible[0].key);
  React.useEffect(()=>{ if(!visible.find(t=>t.key===tab)) setTab("dashboard") }, [role]);

  return <div className="min-h-screen bg-gray-50 p-4">
    <div className="mx-auto max-w-6xl">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xl font-bold">Quản lý đại lý xe</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Vai trò:</span>
          <select className="rounded-xl border p-2" value={role} onChange={e=>setRole(e.target.value as Role)}>
            <option value="MANAGER">Quản lý</option>
            <option value="STAFF">Nhân viên</option>
          </select>
        </div>
        <nav className="flex flex-wrap gap-2">
          {visible.map(t => <Button key={t.key} onClick={()=>setTab(t.key)} className={tab===t.key ? "bg-black text-white" : "bg-white"}>{t.label}</Button>)}
        </nav>
      </header>

      <main className="space-y-4">
        {tab==="dashboard" && <Dashboard api={api} />}
        {tab==="orders" && <Orders api={api} can={can} />}
        {tab==="inventory" && <Inventory api={api} can={can} />}
        {tab==="vouchers" && <Vouchers api={api} can={can} />}
        {tab==="deliveries" && <Deliveries api={api} can={can} />}
      </main>
    </div>
  </div>;
}
