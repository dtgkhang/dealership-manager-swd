import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";

export default function Accounts({ api }: { api: ReturnType<typeof useApi> }) {
  const { loading, data, error, reload } = useReloadable<any[]>(() => (api as any).listUsers(), []);
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [pwdOpen, setPwdOpen] = React.useState<{ open: boolean; id?: number; email?: string }>({ open: false });
  const [pwd, setPwd] = React.useState("");

  const [form, setForm] = React.useState<{ name: string; email: string; password: string; phoneNumber?: string; address?: string; role: 'MANAGER'|'STAFF' }>({ name: '', email: '', password: '', phoneNumber: '', address: '', role: 'STAFF' });

  const roleIdOf = (r: 'MANAGER'|'STAFF') => r === 'MANAGER' ? 1 : 2;
  const toggleRoleId = (roleName?: string) => (roleName && roleName.toUpperCase().includes('MANAGER')) ? 2 : 1;

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Tài khoản</h2>
      <div className="flex items-center gap-2">
        <input className="rounded-xl border p-2 text-sm" placeholder="Tìm tên/email" value={q} onChange={e=>setQ(e.target.value)} />
        <Button variant="primary" onClick={()=>{ setOpen(true); setErr(null); }}>Tạo tài khoản</Button>
      </div>
    </div>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <div className="overflow-x-auto">
      <table className="min-w-full table-auto text-xs md:text-sm">
        <thead><tr className="text-left text-gray-600"><th className="p-2">ID</th><th className="p-2">Tên</th><th className="p-2">Email</th><th className="p-2">Vai trò</th><th className="p-2">Thao tác</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={5}>Đang tải…</td></tr> : ((data as any[]) ?? []).filter(u => {
            const s = (q||'').toLowerCase(); if (!s) return true;
            return (String(u.name||'').toLowerCase().includes(s) || String(u.email||'').toLowerCase().includes(s));
          }).map((u:any) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">#{u.id}</td>
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2 space-x-2">
                <Button onClick={async()=>{ try { await (api as any).updateUserRole(u.id, toggleRoleId(u.role)); reload(); } catch(e:any){ alert(e?.message || 'Đổi role thất bại'); } }}>Đổi role</Button>
                <Button variant="info" onClick={()=>{ setPwd(''); setPwdOpen({ open: true, id: u.id, email: u.email }); }}>Đặt lại mật khẩu</Button>
                <Button variant="danger" onClick={async()=>{ if(!confirm(`Xóa ${u.email}?`)) return; try { await (api as any).deleteUser(u.id); reload(); } catch(e:any){ alert(e?.message || 'Xóa thất bại'); } }}>Xóa</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo tài khoản">
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <input className={`w-full rounded-xl border p-2 ${err && !form.name.trim() ? 'border-red-500' : ''}`} placeholder="Tên" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
          <input className={`w-full rounded-xl border p-2 ${err && !form.email.trim() ? 'border-red-500' : ''}`} placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
          <input className={`w-full rounded-xl border p-2 ${err && form.password.length<6 ? 'border-red-500' : ''}`} type="password" placeholder="Mật khẩu (>=6)" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} />
          <select className="w-full rounded-xl border p-2" value={form.role} onChange={e=>setForm({...form, role: e.target.value as any})}>
            <option value="STAFF">Nhân viên</option>
            <option value="MANAGER">Quản lý</option>
          </select>
          <input className="w-full rounded-xl border p-2 col-span-2" placeholder="SĐT" value={form.phoneNumber} onChange={e=>setForm({...form, phoneNumber:e.target.value})} />
          <input className="w-full rounded-xl border p-2 col-span-2" placeholder="Địa chỉ" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setOpen(false)}>Hủy</Button>
          <Button variant="primary" onClick={async()=>{
            try {
              setErr(null);
              if (!form.name.trim()) { setErr('Nhập tên'); return; }
              if (!form.email.trim()) { setErr('Nhập email'); return; }
              if (form.password.length < 6) { setErr('Mật khẩu >= 6 ký tự'); return; }
              await (api as any).createUser({ name: form.name.trim(), email: form.email.trim(), password: form.password, phoneNumber: form.phoneNumber, address: form.address, roleId: roleIdOf(form.role) });
              setOpen(false); reload();
              setForm({ name:'', email:'', password:'', phoneNumber:'', address:'', role: 'STAFF' });
            } catch (e:any) { setErr(e?.message || 'Tạo tài khoản thất bại'); }
          }}>Tạo</Button>
        </div>
      </div>
    </Modal>

    <Modal open={pwdOpen.open} onClose={()=>setPwdOpen({ open:false })} title={`Đặt lại mật khẩu ${pwdOpen.email ?? ''}`}>
      <div className="space-y-3">
        <input className={`w-full rounded-xl border p-2 ${pwd.length<6 ? 'border-red-500' : ''}`} type="password" placeholder="Mật khẩu mới (>=6)" value={pwd} onChange={e=>setPwd(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setPwdOpen({ open:false })}>Hủy</Button>
          <Button variant="primary" onClick={async()=>{ try { if (!pwdOpen.id) return; if (pwd.length<6) return; await (api as any).updateUserPassword(pwdOpen.id, pwd); setPwdOpen({ open:false }); } catch(e:any){ alert(e?.message || 'Đặt lại mật khẩu thất bại'); } }}>Lưu</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
