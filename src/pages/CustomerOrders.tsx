import React from "react";
import { Button, Card, Modal } from "../components/ui";
import { useReloadable } from "../hooks/useReloadable";
import { useApi } from "../lib/api";
import { currency } from "../lib/utils";
import { formatDate, formatDateTime } from "../lib/format";
import { getRoleFromToken } from "../lib/api";

export default function CustomerOrders({
  api,
  can,
  onCreateDelivery,
}: {
  api: ReturnType<typeof useApi>;
  can: (p: string) => boolean;
  onCreateDelivery?: (orderId: number) => void;
}) {
  const { loading, data, error, reload } = useReloadable<any[]>((api as any).listCustomerOrders, []);
  const [q, setQ] = React.useState("");
  const { data: models } = useReloadable<any[]>(api.listModels, []);
  const { data: vouchers } = useReloadable<any[]>((api as any).listVouchers, []);
  const [open, setOpen] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<{ vehicleId: number | ""; customerInfo: string; brand?: string; price?: number | ""; deliveryDate?: string; voucherCode?: string }>(()=>({ vehicleId: "", customerInfo: "", brand: "", price: "", deliveryDate: "", voucherCode: "" }));
  const [status, setStatus] = React.useState<string|"">("");
  const [createdFrom, setCreatedFrom] = React.useState("");
  const [createdTo, setCreatedTo] = React.useState("");
  const [deliveryFrom, setDeliveryFrom] = React.useState("");
  const [deliveryTo, setDeliveryTo] = React.useState("");
  const [priceMin, setPriceMin] = React.useState<string>("");
  const [priceMax, setPriceMax] = React.useState<string>("");
  const [staffQ, setStaffQ] = React.useState<string>("");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const isManager = getRoleFromToken() === 'MANAGER';
  const [detail, setDetail] = React.useState<any | null>(null);
  const today = new Date().toISOString().slice(0,10);

  const modelById = React.useMemo(()=> new Map(((models ?? []) as any[]).map((m: any) => [m.id, m])), [models]);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Đơn khách hàng</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input className="rounded-xl border p-2 text-sm" placeholder="Tìm khách / mẫu xe" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="rounded-xl border p-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="PENDING">PENDING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <Button onClick={()=>setAdvancedOpen(v=>!v)}>{advancedOpen ? 'Ẩn bộ lọc' : 'Bộ lọc nâng cao'}</Button>
        <Button variant="primary" onClick={()=>{ setOpen(true); setErr(null); setNotice(null); }}>Tạo đơn</Button>
      </div>

      {advancedOpen && (
        <div className="mt-2 rounded-xl border p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-600">Ngày tạo từ</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="date" value={createdFrom} onChange={e=>setCreatedFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Ngày tạo đến</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="date" value={createdTo} onChange={e=>setCreatedTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Giao dự kiến từ</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="date" value={deliveryFrom} onChange={e=>setDeliveryFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Giao dự kiến đến</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="date" value={deliveryTo} onChange={e=>setDeliveryTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Giá từ</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="number" placeholder="0" value={priceMin} onChange={e=>setPriceMin(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Giá đến</label>
              <input className="w-full rounded-xl border p-2 text-sm" type="number" placeholder="" value={priceMax} onChange={e=>setPriceMax(e.target.value)} />
            </div>
            {isManager && <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Nhân viên</label>
              <input className="w-full rounded-xl border p-2 text-sm" placeholder="Tên nhân viên" value={staffQ} onChange={e=>setStaffQ(e.target.value)} />
            </div>}
            <div className="md:col-span-4 flex justify-end gap-2">
              <Button onClick={()=>{ setQ(''); setStatus(''); setCreatedFrom(''); setCreatedTo(''); setDeliveryFrom(''); setDeliveryTo(''); setPriceMin(''); setPriceMax(''); setStaffQ(''); }}>Reset</Button>
            </div>
          </div>
        </div>
      )}
    </div>
    <Card>
      {(() => {
        const rows: any[] = ((data as any[]) ?? []);
        const totalOrders = rows.length;
        const completed = rows.filter(o => String(o.status||'').toUpperCase()==='COMPLETED');
        const pending = rows.filter(o => String(o.status||'').toUpperCase()==='PENDING');
        const cancelled = rows.filter(o => String(o.status||'').toUpperCase()==='CANCELLED');
        const revenue = completed.reduce((sum, o:any)=> sum + Number(o.priceAfter || o.price || 0), 0);
        return <div className="flex flex-wrap items-center gap-6 text-sm">
          <div><span className="text-gray-600">Tổng đơn:</span> <span className="font-semibold">{totalOrders}</span></div>
          <div><span className="text-gray-600">Đang chờ:</span> <span className="font-semibold">{pending.length}</span></div>
          <div><span className="text-gray-600">Hoàn tất:</span> <span className="font-semibold">{completed.length}</span></div>
          <div><span className="text-gray-600">Đã hủy:</span> <span className="font-semibold">{cancelled.length}</span></div>
          <div><span className="text-gray-600">Doanh thu:</span> <span className="font-semibold">{currency(revenue)}</span></div>
        </div>;
      })()}
      {error && <div className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{String(error)}</div>}
      {notice && <div className="mb-2 rounded-lg bg-green-50 p-2 text-sm text-green-700">{notice}</div>}
      <div className="overflow-x-auto">
      <table className="min-w-full table-auto text-xs md:text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="p-2">ID</th>
            <th className="p-2">Ngày tạo</th>
            <th className="p-2">Khách hàng</th>
            <th className="p-2 hidden md:table-cell">Nhân viên</th>
            <th className="p-2">Mẫu xe</th>
            <th className="p-2">Dự kiến giao</th>
            <th className="p-2">Giá</th>
            <th className="p-2 hidden md:table-cell">Giảm</th>
            <th className="p-2">Sau KM</th>
            <th className="p-2">Trạng thái</th>
            <th className="p-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td className="p-2" colSpan={11}>Đang tải…</td></tr> : ((data as any[]) ?? []).filter((o:any)=>{
            const s=(q||"").toLowerCase();
            if (status && String(o.status||'') !== status) return false;
            // created range
            const cISO = String(o.createdAt||''); const cd = cISO ? new Date(cISO) : null;
            if (cd && createdFrom) { const f=new Date(createdFrom); if (cd < new Date(f.getFullYear(),f.getMonth(),f.getDate())) return false; }
            if (cd && createdTo) { const t=new Date(createdTo); if (cd > new Date(t.getFullYear(),t.getMonth(),t.getDate(),23,59,59,999)) return false; }
            // delivery range
            const dISO = String(o.deliveryDate||''); const dd = dISO ? new Date(dISO) : null;
            if (dd && deliveryFrom) { const f=new Date(deliveryFrom); if (dd < new Date(f.getFullYear(),f.getMonth(),f.getDate())) return false; }
            if (dd && deliveryTo) { const t=new Date(deliveryTo); if (dd > new Date(t.getFullYear(),t.getMonth(),t.getDate(),23,59,59,999)) return false; }
            // price range
            const p = Number(o.priceAfter ?? o.price ?? 0);
            if (priceMin && p < Number(priceMin)) return false;
            if (priceMax && p > Number(priceMax)) return false;
            if (isManager && staffQ && !String(o.username||'').toLowerCase().includes(staffQ.toLowerCase())) return false;
            if (!s) return true;
            const model = modelById.get(o.vehicleId)?.model ?? o.vehicleModel ?? '';
            return (String(o.customerInfo ?? '').toLowerCase().includes(s) || String(model).toLowerCase().includes(s));
          }).map((o: any) => (
            <tr key={o.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={()=>setDetail(o)}>
              <td className="p-2">#{o.id}</td>
              <td className="p-2">{formatDateTime(o.createdAt)}</td>
              <td className="p-2">{o.customerInfo ?? ''}</td>
              <td className="p-2 hidden md:table-cell">{o.username ?? ''}</td>
              <td className="p-2">{o.vehicleModel ?? (modelById.get(o.vehicleId)?.model ?? o.vehicleId)}</td>
              <td className="p-2">{formatDate(o.deliveryDate)}</td>
              <td className="p-2">{currency(Number(o.price || 0))}</td>
              <td className="p-2 hidden md:table-cell">{currency(Number(o.discountApplied || 0))}</td>
              <td className="p-2 font-semibold">{currency(Number(o.priceAfter || o.price || 0))}</td>
              <td className="p-2">{o.status ?? ''}</td>
              <td className="p-2 space-x-2">
                {onCreateDelivery && can("DELIVERY.CREATE") && String(o.status || '').toUpperCase() === 'PENDING' && (
                  <Button
                    variant="success"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>)=>{ e.stopPropagation(); onCreateDelivery(o.id); }}
                  >
                    Lập phiếu giao
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>)=>{ e.stopPropagation(); printOrderInvoice(o); }}
                >
                  In hóa đơn
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Tạo đơn khách hàng">
      <div className="space-y-3">
        {err && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs">Mẫu xe</label>
            <select className="w-full rounded-xl border p-2" value={form.vehicleId}
                    onChange={e=>{
                      const id = e.target.value ? Number(e.target.value) : "" as any;
                      const m: any = id ? modelById.get(id) : null;
                      setForm({ ...form, vehicleId: id, brand: m?.brand?.name ?? '' });
                    }}>
              <option value="">Chọn mẫu</option>
              {((models as any[]) ?? []).map((m:any) => (
                <option key={m.id} value={m.id}>{(m.brand?.name ?? '')} {m.model}</option>
              ))}
            </select>
          </div>
          <div>
            <input className={`w-full rounded-xl border p-2 ${err && (!form.customerInfo || !form.customerInfo.trim()) ? 'border-red-500' : ''}`} placeholder="Tên khách / ghi chú" value={form.customerInfo} onChange={e=>setForm({ ...form, customerInfo: e.target.value })} />
            {err && (!form.customerInfo || !form.customerInfo.trim()) && <div className="mt-1 text-xs text-red-600">Vui lòng nhập thông tin khách</div>}
          </div>
          <div>
            <input className={`w-full rounded-xl border p-2 ${err && (typeof form.price==='number' && form.price <= 0) ? 'border-red-500' : ''}`} type="number" placeholder="Giá bán (VNĐ)" min={0} value={form.price ?? ''} onChange={e=>{ const v=e.target.value; setForm({ ...form, price: v===''? '' : Number(v) }); }} />
            {err && (typeof form.price==='number' && form.price <= 0) && <div className="mt-1 text-xs text-red-600">Giá phải &gt; 0</div>}
          </div>
          <div>
            <label className="text-xs">Ngày giao dự kiến</label>
            <input
              className="w-full rounded-xl border p-2"
              type="date"
              min={today}
              value={(form.deliveryDate || '').split('T')[0]}
              onChange={e=> setForm({ ...form, deliveryDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs">Voucher (tuỳ chọn)</label>
            <select className="w-full rounded-xl border p-2" value={form.voucherCode||''} onChange={e=>setForm({...form, voucherCode: e.target.value||''})}>
              <option value="">Không áp dụng</option>
              {((vouchers as any[]) ?? []).map((v:any)=> <option key={v.id} value={v.code}>{v.code} – {v.title}</option>)}
            </select>
          </div>
        </div>
        {(() => {
          const v = ((vouchers as any[]) ?? []).find((x:any)=> x.code === form.voucherCode);
          const p = typeof form.price==='number' ? form.price : 0;
          let d = 0;
          if (v && p>0) {
            const min = v.min_price ?? null; if (min!=null && p < min) d = 0; else {
              if (v.type==='FLAT' && v.amount) d = v.amount;
              if (v.type==='PERCENT' && v.percent) d = Math.floor((p * v.percent)/100);
              if (v.max_discount!=null) d = Math.min(d, v.max_discount);
            }
          }
          const after = Math.max(0, p - d);
          return <div className="rounded-xl border p-3 text-sm text-gray-700">
            <div>Giá trước: <span className="font-medium">{currency(p)}</span></div>
            <div>Giảm: <span className="font-medium">{currency(d)}</span></div>
            <div>Giá sau: <span className="font-semibold">{currency(after)}</span></div>
          </div>;
        })()}
        <div className="flex justify-end gap-2">
          <Button onClick={()=>setOpen(false)}>Hủy</Button>
          <Button variant="primary" onClick={async()=>{
            try {
              setErr(null);
              if (!form.vehicleId) { setErr('Vui lòng chọn mẫu xe'); return; }
              if (!form.customerInfo || !form.customerInfo.trim()) { setErr('Vui lòng nhập thông tin khách'); return; }
              if (typeof form.price === 'number' && form.price <= 0) { setErr('Giá bán phải > 0'); return; }
              const payload: any = {
                vehicleId: form.vehicleId,
                customerInfo: form.customerInfo.trim(),
                brand: form.brand,
                price: typeof form.price === 'number' ? form.price : undefined,
                voucherCode: form.voucherCode || undefined,
                deliveryDate: form.deliveryDate || undefined,
              };
              await (api as any).createCustomerOrder(payload);
              setOpen(false);
              setNotice('Tạo đơn thành công');
              reload();
            } catch (e:any) {
              console.error('Create customer order failed', e);
              setErr(e?.message || 'Tạo đơn thất bại');
            }
          }} disabled={!form.vehicleId || !form.customerInfo}>Tạo</Button>
        </div>
      </div>
    </Modal>

    <Modal open={!!detail} onClose={()=>setDetail(null)} title={`Chi tiết đơn #${detail?.id ?? ""}`}>
      {detail && (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Khách hàng:</span> <span className="font-medium">{detail.customerInfo ?? ''}</span></div>
            <div><span className="text-gray-500">Nhân viên:</span> <span className="font-medium">{detail.username ?? ''}</span></div>
            <div><span className="text-gray-500">Mẫu xe:</span> <span className="font-medium">{detail.vehicleModel ?? (modelById.get(detail.vehicleId)?.model ?? detail.vehicleId)}</span></div>
            <div><span className="text-gray-500">Trạng thái:</span> <span className="font-medium">{detail.status ?? ''}</span></div>
            <div><span className="text-gray-500">Ngày tạo:</span> <span className="font-medium">{formatDateTime(detail.createdAt)}</span></div>
            <div><span className="text-gray-500">Dự kiến giao:</span> <span className="font-medium">{formatDate(detail.deliveryDate)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Giá trước KM:</span> <span className="font-medium">{currency(Number(detail.price || 0))}</span></div>
            <div><span className="text-gray-500">Giảm giá:</span> <span className="font-medium">{currency(Number(detail.discountApplied || 0))}</span></div>
            <div><span className="text-gray-500">Giá sau KM:</span> <span className="font-semibold">{currency(Number(detail.priceAfter || detail.price || 0))}</span></div>
            <div><span className="text-gray-500">Voucher:</span> <span className="font-medium">{detail.voucherCode ?? 'Không áp dụng'}</span></div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button onClick={()=>setDetail(null)}>Đóng</Button>
            <Button variant="primary" onClick={()=>printOrderInvoice(detail)}>In hóa đơn</Button>
          </div>
        </div>
      )}
    </Modal>
  </div>;
}

function printOrderInvoice(o: any) {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  const doc = win.document;
  const created = o.createdAt ? String(o.createdAt).toString().replace('T', ' ').substring(0, 19) : '';
  const delivery = o.deliveryDate ? String(o.deliveryDate).toString().substring(0, 10) : '';
  const price = Number(o.price || 0);
  const discount = Number(o.discountApplied || 0);
  const after = Number(o.priceAfter || o.price || 0);
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Hóa đơn đơn hàng #${o.id}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td, th { padding: 6px 4px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: left; }
      .right { text-align: right; }
      .muted { color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Hóa đơn đơn hàng #${o.id}</h1>
    <div class="muted">Ngày tạo: ${created}</div>
    <h2>Thông tin khách hàng</h2>
    <table>
      <tr><td>Khách hàng</td><td>${o.customerInfo ?? ''}</td></tr>
      <tr><td>Nhân viên</td><td>${o.username ?? ''}</td></tr>
    </table>
    <h2>Thông tin xe</h2>
    <table>
      <tr><td>Mẫu xe</td><td>${o.vehicleModel ?? o.vehicleId ?? ''}</td></tr>
      <tr><td>Dự kiến giao</td><td>${delivery}</td></tr>
      <tr><td>Trạng thái</td><td>${o.status ?? ''}</td></tr>
    </table>
    <h2>Thanh toán</h2>
    <table>
      <tr><td>Giá trước khuyến mãi</td><td class="right">${price.toLocaleString('vi-VN')} đ</td></tr>
      <tr><td>Giảm giá</td><td class="right">- ${discount.toLocaleString('vi-VN')} đ</td></tr>
      <tr><td>Giá sau khuyến mãi</td><td class="right"><strong>${after.toLocaleString('vi-VN')} đ</strong></td></tr>
      <tr><td>Voucher</td><td class="right">${o.voucherCode ?? 'Không áp dụng'}</td></tr>
    </table>
  </body>
</html>`);
  doc.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
