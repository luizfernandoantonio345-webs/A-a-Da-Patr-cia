"use client";
import React from "react";

export function Acai({ toppings = [], fill = 0.8, w = 96 }:
  { toppings?: string[]; fill?: number; w?: number }) {
  const list = toppings.slice(0, 12);
  const cols = 4;
  const cluster = list.map((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    return { c, x: 34 + col * 17 + (row % 2 ? 8 : 0), y: 44 - row * 8 };
  });
  const top = 116 - fill * 74;
  return (
    <svg width={w} height={w * 1.25} viewBox="0 0 120 150" fill="none">
      <defs>
        <linearGradient id="af" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A4FC0" /><stop offset=".55" stopColor="#5B2A88" /><stop offset="1" stopColor="#2A0E3F" />
        </linearGradient>
        <linearGradient id="gl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".45" stopColor="#fff" stopOpacity=".05" /><stop offset="1" stopColor="#fff" stopOpacity=".28" />
        </linearGradient>
        <clipPath id="cin"><path d="M28 46 h64 l-7 76 a11 11 0 0 1 -11 10 h-28 a11 11 0 0 1 -11 -10 z" /></clipPath>
      </defs>
      <ellipse cx="60" cy="140" rx="34" ry="6" fill="#2A0E3F" opacity=".16" />
      {cluster.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="6.6" fill={d.c} stroke="#0000000f" />)}
      {list.length === 0 && <circle cx="60" cy="40" r="7" fill="#E24C86" stroke="#0000000f" />}
      <path d="M28 46 h64 l-7 76 a11 11 0 0 1 -11 10 h-28 a11 11 0 0 1 -11 -10 z" fill="#F7F1FB" stroke="#E7DAF2" strokeWidth="2" />
      <g clipPath="url(#cin)">
        <rect x="24" y={top} width="72" height="120" fill="url(#af)" />
        <ellipse cx="60" cy={top + 5} rx="33" ry="7" fill="#F1E6CE" opacity=".92" />
      </g>
      <path d="M28 46 h64 l-7 76 a11 11 0 0 1 -11 10 h-28 a11 11 0 0 1 -11 -10 z" fill="url(#gl)" />
      <path d="M84 60 q5 14 0 24 q-6 -6 0 -24" fill="#E24C86" opacity=".8" />
      <rect x="83" y="12" width="6" height="52" rx="3" fill="#EAD8F6" transform="rotate(18 86 38)" />
    </svg>
  );
}
