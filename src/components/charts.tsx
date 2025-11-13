import React from "react";

export function SimpleDonut({ data, size=120, stroke=14, colors=[] as string[] }: { data: { label: string; value: number }[]; size?: number; stroke?: number; colors?: string[] }) {
  const total = Math.max(1, data.reduce((s, d) => s + (d.value || 0), 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      {data.map((d, i) => {
        const frac = (d.value || 0) / total;
        const dash = frac * circumference;
        const dasharray = `${dash} ${circumference - dash}`;
        const el = (
          <circle key={i}
            cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={colors[i % colors.length] || ["#111827","#2563eb","#16a34a","#f59e0b","#ef4444"][i%5]}
            strokeWidth={stroke}
            strokeDasharray={dasharray}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export function SimpleBar({ data, height=80, color="#111827" }: { data: number[]; height?: number; color?: string }) {
  const max = Math.max(1, ...data);
  const width = Math.max(1, data.length * 12);
  const barW = 8;
  const gap = 4;
  return (
    <svg width={width} height={height} className="block">
      {data.map((v, i) => {
        const h = Math.round((v / max) * (height - 4));
        const x = i * (barW + gap);
        const y = height - h;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx={2} fill={color} />;
      })}
    </svg>
  );
}

