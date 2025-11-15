import React from 'react';
import { Button, Card } from '../components/ui';
import { login as backendLogin, register as backendRegister, setToken } from '../lib/api';

export default function Auth({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = React.useState<'login'|'register'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [roleId, setRoleId] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    try {
      setLoading(true); setError(null);
      if (mode === 'login') {
        await backendLogin(email, password);
        onSuccess();
      } else {
        await backendRegister({ name, email, password, roleId });
        await backendLogin(email, password);
        onSuccess();
      }
    } catch (e: any) {
      setError(e?.message ?? 'Authentication failed');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card>
        <div className="w-[360px] space-y-4">
          <div className="text-center">
            <div className="text-xl font-bold">Đăng nhập hệ thống</div>
            <div className="mt-1 text-xs text-gray-500">Quản lý đại lý xe điện</div>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm">
            <button className={mode==='login' ? 'font-semibold' : ''} onClick={()=>setMode('login')}>Đăng nhập</button>
            <span className="text-gray-400">·</span>
            <button className={mode==='register' ? 'font-semibold' : ''} onClick={()=>setMode('register')}>Đăng ký</button>
          </div>
          {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          {mode==='register' && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Họ tên</label>
                <input className="w-full rounded-xl border p-2" placeholder="Họ tên" value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Vai trò</label>
                <select className="w-full rounded-xl border p-2" value={roleId} onChange={e=>setRoleId(Number(e.target.value))}>
                  <option value={1}>Manager</option>
                  <option value={2}>Staff</option>
                </select>
              </div>
            </>
          )}
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Email</label>
            <input className="w-full rounded-xl border p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Mật khẩu</label>
            <input className="w-full rounded-xl border p-2" type="password" placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <Button className="w-full" variant="primary" onClick={submit} disabled={loading}>
            {loading ? 'Đang xử lý…' : (mode==='login' ? 'Đăng nhập' : 'Tạo tài khoản')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
