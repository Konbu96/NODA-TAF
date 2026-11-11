"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { PencilIcon } from "./icons";

// 画面で何度も使う小さな部品

export const chipOn = "border-2 border-accent bg-accent text-white font-bold";
export const chipOff = "border border-line bg-white text-[#334155]";

export function Chip({
  on, onClick, children, className = "", small,
}: { on: boolean; onClick?: () => void; children: ReactNode; className?: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`${small ? "h-[34px] px-3 text-[13px]" : "h-9 px-3 text-[13px]"} rounded-full ${on ? chipOn : chipOff} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl bg-white px-4 py-3.5 ${className}`}>{children}</section>;
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`m-0 text-[13px] font-bold text-sub ${className}`}>{children}</p>;
}

export function PrimaryButton({
  children, onClick, disabled, type = "button",
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-primary
      className="h-[52px] w-full rounded-xl bg-accent text-base font-bold text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** 編集ボタン（大会・部員・マイページなどで同じ形）。href ならリンク、onClick ならボタン */
export function EditButton({
  href, onClick, label = "編集", ariaLabel, small,
}: { href?: string; onClick?: () => void; label?: string; ariaLabel?: string; small?: boolean }) {
  const cls = `flex shrink-0 items-center gap-1 rounded-full bg-accent-soft font-bold text-accent ${small ? "h-8 px-2.5 text-xs" : "h-11 px-3 text-[13px]"}`;
  const inner = (
    <>
      <PencilIcon size={small ? 13 : 16} />
      {label}
    </>
  );
  return href ? (
    <Link href={href} aria-label={ariaLabel} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} aria-label={ariaLabel} className={cls}>
      {inner}
    </button>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex h-[52px] w-full items-center justify-center rounded-xl bg-accent text-base font-bold text-white">
      {children}
    </Link>
  );
}

/** 保存したあとに下に出るお知らせ */
export function Toast({
  text, link, onDone,
}: { text: string; link?: { href: string; label: string }; onDone?: () => void }) {
  useEffect(() => {
    if (!onDone) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-5 pb-7">
      <div role="status" className="anim-fade pointer-events-auto flex items-center justify-between gap-2.5 rounded-xl bg-ink px-4 py-3.5 text-white">
        <span className="text-sm">{text}</span>
        {link && (
          <Link href={link.href} className="text-sm font-bold text-[#BFDBFE]">
            {link.label}
          </Link>
        )}
      </div>
    </div>
  );
}

/** 下から出てくる設定画面 */
export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[480px]">
      <button aria-label="閉じる" onClick={onClose} className="anim-fade absolute inset-0 bg-ink/45" />
      <section
        role="dialog"
        aria-label={title}
        className="anim-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-3.5 overflow-y-auto rounded-t-[20px] bg-white text-ink px-5 pt-2.5 pb-7"
      >
        <div className="h-1 w-10 self-center rounded-full bg-line" />
        <p className="m-0 text-[17px] font-bold">{title}</p>
        {children}
      </section>
    </div>
  );
}

/** 追い風参考の「参」 */
export function RefMark({ small }: { small?: boolean }) {
  return (
    <span
      aria-label="追い風参考"
      className={`mr-1 inline-flex items-center justify-center rounded-full border-[1.5px] border-warn-dark align-middle font-bold leading-none text-warn-dark ${small ? "h-[18px] w-[18px] text-[11px]" : "h-[22px] w-[22px] text-xs"}`}
    >
      参
    </span>
  );
}

export function PbTag() {
  return <span className="rounded-lg bg-warn px-1.5 py-px text-[11px] font-bold text-white">PB</span>;
}

/** 確認の小さな枠 */
export function Confirm({
  title, note, okLabel, onOk, onCancel, danger,
}: { title: string; note?: string; okLabel: string; onOk: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div role="alertdialog" aria-label={title} className={`flex flex-col gap-3 rounded-xl border bg-white px-4 py-3.5 ${danger ? "border-[#FCA5A5]" : "border-line"}`}>
      <p className="m-0 text-center text-[15px] font-bold">{title}</p>
      {note && <p className="m-0 text-center text-xs text-muted">{note}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="h-11 rounded-[10px] border border-line bg-white text-sm text-[#334155]">
          やめる
        </button>
        <button onClick={onOk} className={`h-11 rounded-[10px] text-sm font-bold text-white ${danger ? "bg-danger" : "bg-accent"}`}>
          {okLabel}
        </button>
      </div>
    </div>
  );
}

/** − 数 ＋ */
export function Stepper({
  value, onChange, min = 0, max = 99, label,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  const btn = "h-10 w-10 rounded-[10px] border border-line bg-white text-lg text-accent disabled:text-line";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label={`${label}を減らす`}>
        −
      </button>
      <b className="w-[22px] text-center text-lg">{value}</b>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label={`${label}を増やす`}>
        ＋
      </button>
    </div>
  );
}

export function Badge({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-warn px-[5px] text-xs font-bold text-white ${className}`}>
      {n}
    </span>
  );
}
