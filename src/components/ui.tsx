import React from "react";
import { clsx } from "../lib/utils";

export const Button = ({ children, onClick, className="", disabled=false }: { children: React.ReactNode; onClick?: ()=>void; className?: string; disabled?: boolean; }) =>
  <button onClick={onClick} disabled={disabled} className={clsx("rounded-xl px-3 py-2 text-sm font-medium shadow border hover:shadow-md disabled:opacity-50", className)}>{children}</button>;

export const Card = ({ children, title, className="" }: { children: React.ReactNode; title?: string; className?: string; }) =>
  <div className={clsx("rounded-2xl border bg-white p-4 shadow-sm", className)}>{title && <div className="mb-2 text-sm font-semibold text-gray-700">{title}</div>}{children}</div>;

export const Badge = ({ children, className="" }: { children: React.ReactNode; className?: string; }) =>
  <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>;

export const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: ()=>void; title: string; children: React.ReactNode; }) => !open ? null : (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
    <div className="w-full max-w-xl rounded-2xl border bg-white p-4 shadow-xl" onClick={e=>e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold">{title}</h3><button onClick={onClose}>✕</button></div>{children}
    </div>
  </div>
);

