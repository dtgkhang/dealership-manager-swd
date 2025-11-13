import React from "react";
import { clsx } from "../lib/utils";

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'info' | 'warning';
export const Button = ({ children, onClick, className="", disabled=false, variant='secondary' }: { children: React.ReactNode; onClick?: ()=>void; className?: string; disabled?: boolean; variant?: ButtonVariant; }) => {
  const base = "rounded-xl px-3 py-2 text-sm font-medium shadow border transition hover:shadow-md active:shadow disabled:opacity-50 focus-visible:outline-none";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-black text-white border-black hover:bg-gray-900 active:bg-gray-800 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
    secondary: "bg-white text-gray-900 border-gray-200 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2",
    success: "bg-green-600 text-white border-green-600 hover:bg-green-700 active:bg-green-800 focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2",
    info: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
    warning: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 active:bg-amber-700 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
    ghost: "bg-transparent text-gray-700 border-transparent hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2",
  };
  return <button onClick={onClick} disabled={disabled} className={clsx(base, styles[variant], className)}>{children}</button>;
};

export const Card = ({ children, title, className="", actions }: { children: React.ReactNode; title?: string; className?: string; actions?: React.ReactNode; }) => (
  <div className={clsx("rounded-2xl border bg-white p-4 shadow-sm", className)}>
    {(title || actions) && <div className="mb-3 flex items-center justify-between"><div className="text-sm font-semibold text-gray-800">{title}</div><div>{actions}</div></div>}
    {children}
  </div>
);

export const Badge = ({ children, className="" }: { children: React.ReactNode; className?: string; }) =>
  <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>;

export const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: ()=>void; title: string; children: React.ReactNode; }) => !open ? null : (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
    <div className="w-full max-w-xl rounded-2xl border bg-white p-5 shadow-xl" onClick={e=>e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-semibold">{title}</h3><button className="text-gray-500" onClick={onClose}>✕</button></div>{children}
    </div>
  </div>
);

export const StatCard = ({ label, value, hint, className="" }: { label: string; value: React.ReactNode; hint?: string; className?: string; }) => (
  <Card className={clsx("", className)}>
    <div className="text-3xl font-bold">{value}</div>
    <div className="text-xs text-gray-500">{label}{hint ? ` · ${hint}` : ''}</div>
  </Card>
);

export const ConfirmModal = ({ open, title, message, onCancel, onConfirm }: { open: boolean; title: string; message: string; onCancel: ()=>void; onConfirm: ()=>void; }) => !open ? null : (
  <Modal open={open} onClose={onCancel} title={title}>
    <p className="mb-4 text-sm text-gray-700">{message}</p>
    <div className="flex justify-end gap-2">
      <Button onClick={onCancel}>Hủy</Button>
      <Button variant="danger" onClick={onConfirm}>Xác nhận</Button>
    </div>
  </Modal>
);
