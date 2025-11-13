import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { currency } from "../lib/utils";
import { useApi } from "../lib/api";
import type { VoucherType } from "../lib/types";

export default function Vouchers({ api, can }: { api: ReturnType<typeof useApi>, can: (p:string)=>boolean }) {
  const { loading, data, reload, error } = useReloadable(api.listVouchers, []);
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
      <Button className="bg-black text-white" onClick={()=>setOpen(true)} disabled={!can("VOUCHER.CREATE")}>Tạo mã</Button>
    </div>
    <Card>
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      <table className="w-full table-auto text-sm">
        <thead><tr className="text-left text-gray-600"><th className="p-2">Mã</th><th className="p-2">Loại</th><th className="p-2">Tiêu đề</th><th className="p-2">Điều kiện</th></tr></thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={4}>Đang tải…</td></tr> : (data ?? []).map(v => (
            <tr key={v.id} className="border-t">
              <td className="p-2 font-mono">{v.code}</td>
              <td className="p-2">{v.type}</td>
              <td className="p-2">{v.title} {!v.active && <span className="ml-2 text-xs text-red-600">(Đã hủy)</span>}</td>
              <td className="p-2 text-gray-600">
                Tối thiểu {currency(v.min_price)} · Tối đa {currency(v.max_discount)}
                <div className="mt-1">
                  {v.active ? (
                    <Button onClick={async()=>{ try { await (api as any).updateVoucherActive(v.id, false); reload(); } catch(e:any){ alert(e?.message || 'Hủy voucher thất bại'); } }}>Hủy</Button>
                  ) : (
                    <Button onClick={async()=>{ try { await (api as any).updateVoucherActive(v.id, true); reload(); } catch(e:any){ alert(e?.message || 'Khôi phục voucher thất bại'); } }}>Khôi phục</Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo mã ưu đãi">
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <input className="w-full rounded-xl border p-2" placeholder="Mã (ví dụ: FLAT10M)" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
          <select className="w-full rounded-xl border p-2" value={form.type} onChange={e=>setForm({...form, type:e.target.value as VoucherType})}>
            <option value="FLAT">Giảm số tiền cố định</option>
            <option value="PERCENT">Giảm theo phần trăm</option>
          </select>
          <input className="w-full rounded-xl border p-2 col-span-2" placeholder="Tiêu đề" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs">Tối thiểu áp dụng</label>
            <input className="w-full rounded-xl border p-2" type="number" placeholder="0" value={form.min_price ?? ""} onChange={e=>setForm({...form, min_price: e.target.value? Number(e.target.value): undefined})} />
          </div>
          <div>
            <label className="text-xs">Giảm tối đa</label>
            <input className="w-full rounded-xl border p-2" type="number" placeholder="0" value={form.max_discount ?? ""} onChange={e=>setForm({...form, max_discount: e.target.value? Number(e.target.value): undefined})} />
          </div>
          {form.type === "FLAT" && (
            <div>
              <label className="text-xs">Số tiền giảm</label>
              <input className="w-full rounded-xl border p-2" type="number" placeholder="1000000" value={form.amount ?? ""} onChange={e=>setForm({...form, amount: e.target.value? Number(e.target.value): undefined})} />
            </div>
          )}
          {form.type === "PERCENT" && (
            <div>
              <label className="text-xs">Phần trăm (%)</label>
              <input className="w-full rounded-xl border p-2" type="number" placeholder="5" value={form.percent ?? ""} onChange={e=>setForm({...form, percent: e.target.value? Number(e.target.value): undefined})} />
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
          <Button className="bg-black text-white" onClick={async()=>{
            try {
              setErr(null);
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
