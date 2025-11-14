import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { currency } from "../lib/utils";
import { useApi } from "../lib/api";
import type { VoucherType } from "../lib/types";

export default function Vouchers({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [q, setQ] = React.useState("");
  const { loading, data, reload, error } = useReloadable(() => api.listVouchers(includeInactive), [includeInactive]);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<{
    code: string; title: string; type: VoucherType;
    min_price?: number; max_discount?: number; amount?: number; percent?: number;
    usable_from?: string; usable_to?: string; stackable: boolean;
  }>({ code: "", title: "", type: "FLAT", min_price: undefined, max_discount: undefined, amount: 1000000, percent: undefined, usable_from: "", usable_to: "", stackable: false });
  const [err, setErr] = React.useState<string | null>(null);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Mã ưu đãi</h2>
      <div className="flex items-center gap-2">
        <input className="rounded-xl border p-2 text-sm" placeholder="Tìm mã hoặc tiêu đề" value={q} onChange={e=>setQ(e.target.value)} />
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={includeInactive} onChange={e=>setIncludeInactive(e.target.checked)} /> Hiện cả đã hủy</label>
        <Button variant="primary" onClick={()=>setOpen(true)} disabled={!can("VOUCHER.CREATE")}>Tạo mã</Button>
      </div>
    </div>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <div className="overflow-x-auto">
      <table className="min-w-full table-auto text-xs md:text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="p-2">Mã</th>
            <th className="p-2">Loại</th>
            <th className="p-2">Tiêu đề</th>
            <th className="p-2">Điều kiện</th>
            <th className="p-2">Tạo lúc</th>
            <th className="p-2">Hiệu lực</th>
            <th className="p-2">Cộng dồn</th>
            <th className="p-2">Trạng thái</th>
            <th className="p-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={9}>Đang tải…</td></tr> : ((data as any[]) ?? []).filter((v: any) => {
            const s = (q||"").toLowerCase();
            if (!s) return true;
            return (v.code?.toLowerCase()?.includes(s) || v.title?.toLowerCase()?.includes(s));
          }).map((v: any) => {
            const created = String(v.created_at||'').split('T').join(' ').slice(0,16);
            const range = `${(v.usable_from||'').split('T')[0]||'—'} → ${(v.usable_to||'').split('T')[0]||'—'}`;
            return (
              <tr key={v.id} className="border-t">
                <td className="p-2 font-mono">{v.code}</td>
                <td className="p-2">{v.type}</td>
                <td className="p-2">{v.title}</td>
                <td className="p-2 text-gray-600">Tối thiểu {currency(v.min_price)} · Tối đa {currency(v.max_discount)}</td>
                <td className="p-2">{created}</td>
                <td className="p-2">{range}</td>
                <td className="p-2">{v.stackable ? 'Có' : 'Không'}</td>
                <td className="p-2">{v.active ? 'Hoạt động' : 'Đã hủy'}</td>
                <td className="p-2 space-x-2">
                  {v.active ? (
                    <Button variant="danger" onClick={async()=>{ if(!confirm(`Hủy voucher ${v.code}?`)) return; try { await (api as any).updateVoucherActive(v.id, false); reload(); } catch(e:any){ alert(e?.message || 'Hủy voucher thất bại'); } }}>Hủy</Button>
                  ) : (
                    <Button variant="primary" onClick={async()=>{ if(!confirm(`Khôi phục voucher ${v.code}?`)) return; try { await (api as any).updateVoucherActive(v.id, true); reload(); } catch(e:any){ alert(e?.message || 'Khôi phục voucher thất bại'); } }}>Khôi phục</Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo mã ưu đãi">
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input className={`w-full rounded-xl border p-2 ${err && !form.code.trim() ? 'border-red-500' : ''}`} placeholder="Mã (ví dụ: FLAT10M)" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
            {err && !form.code.trim() && <div className="mt-1 text-xs text-red-600">Vui lòng nhập mã</div>}
          </div>
          <select className="w-full rounded-xl border p-2" value={form.type} onChange={e=>setForm({...form, type:e.target.value as VoucherType})}>
            <option value="FLAT">Giảm số tiền cố định</option>
            <option value="PERCENT">Giảm theo phần trăm</option>
          </select>
          <input className="w-full rounded-xl border p-2 col-span-2" placeholder="Tiêu đề" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs">Tối thiểu áp dụng</label>
            <input className={`w-full rounded-xl border p-2 ${err && (form.min_price!=null && form.min_price < 0) ? 'border-red-500' : ''}`} type="number" placeholder="0" min={0} value={form.min_price ?? ""} onChange={e=>setForm({...form, min_price: e.target.value? Number(e.target.value): undefined})} />
            {err && (form.min_price!=null && form.min_price < 0) && <div className="mt-1 text-xs text-red-600">Không hợp lệ</div>}
          </div>
          <div>
            <label className="text-xs">Giảm tối đa</label>
            <input className={`w-full rounded-xl border p-2 ${err && (form.max_discount!=null && form.max_discount < 0) ? 'border-red-500' : ''}`} type="number" placeholder="0" min={0} value={form.max_discount ?? ""} onChange={e=>setForm({...form, max_discount: e.target.value? Number(e.target.value): undefined})} />
            {err && (form.max_discount!=null && form.max_discount < 0) && <div className="mt-1 text-xs text-red-600">Không hợp lệ</div>}
          </div>
          {form.type === "FLAT" && (
            <div>
              <label className="text-xs">Số tiền giảm</label>
              <input className={`w-full rounded-xl border p-2 ${err && (!form.amount || form.amount <= 0) ? 'border-red-500' : ''}`} type="number" placeholder="1000000" min={1} value={form.amount ?? ""} onChange={e=>setForm({...form, amount: e.target.value? Number(e.target.value): undefined})} />
              {err && (!form.amount || form.amount <= 0) && <div className="mt-1 text-xs text-red-600">Phải &gt; 0</div>}
            </div>
          )}
          {form.type === "PERCENT" && (
            <div>
              <label className="text-xs">Phần trăm (%)</label>
              <input className={`w-full rounded-xl border p-2 ${err && (!form.percent || form.percent <= 0 || form.percent > 100) ? 'border-red-500' : ''}`} type="number" placeholder="5" min={1} max={100} value={form.percent ?? ""} onChange={e=>setForm({...form, percent: e.target.value? Number(e.target.value): undefined})} />
              {err && (!form.percent || form.percent <= 0 || form.percent > 100) && <div className="mt-1 text-xs text-red-600">Trong khoảng 1–100</div>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs">Áp dụng từ</label>
            <input className="w-full rounded-xl border p-2" type="date" value={form.usable_from?.split("T")[0] ?? ""} onChange={e=>setForm({...form, usable_from: e.target.value? new Date(e.target.value).toISOString(): ""})} />
          </div>
          <div>
            <label className="text-xs">Áp dụng đến</label>
            <input className="w-full rounded-xl border p-2" type="date" value={form.usable_to?.split("T")[0] ?? ""} onChange={e=>setForm({...form, usable_to: e.target.value? new Date(e.target.value).toISOString(): ""})} />
          </div>
          <label className="flex items-center gap-2 text-sm mt-5">
            <input type="checkbox" checked={form.stackable} onChange={e=>setForm({...form, stackable: e.target.checked})} /> Cho phép cộng dồn
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setOpen(false)}>Hủy</Button>
          <Button variant="primary" onClick={async()=>{
            try {
              setErr(null);
              const code = form.code.trim();
              if (!code) { setErr('Vui lòng nhập mã voucher'); return; }
              if (form.type === 'FLAT' && (!form.amount || form.amount <= 0)) { setErr('Số tiền giảm phải > 0'); return; }
              if (form.type === 'PERCENT' && (!form.percent || form.percent <= 0 || form.percent > 100)) { setErr('Phần trăm phải trong 1-100'); return; }
              if (form.min_price != null && form.min_price < 0) { setErr('Tối thiểu áp dụng không hợp lệ'); return; }
              if (form.max_discount != null && form.max_discount < 0) { setErr('Giảm tối đa không hợp lệ'); return; }
              await api.createVoucher({
              code: form.code.trim(), title: form.title.trim(), type: form.type,
              min_price: form.min_price, max_discount: form.max_discount,
              amount: form.type === "FLAT" ? form.amount : undefined,
              percent: form.type === "PERCENT" ? form.percent : undefined,
              usable_from: form.usable_from || undefined, usable_to: form.usable_to || undefined,
              stackable: form.stackable,
              } as any);
              setOpen(false);
              reload();
            } catch (e:any) {
              console.error('Create voucher failed', e);
              setErr(e?.message || 'Tạo voucher thất bại');
            }
          }}>Tạo</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
