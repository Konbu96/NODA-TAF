"use client";

import Link from "next/link";
import { BigTrophyIcon } from "@/components/icons";
import { RefMark } from "@/components/ui";
import { kindOf, showMark } from "@/lib/marks";
import type { PbUpdate } from "@/lib/store";

/** 記録を保存して PB が出たときのお祝い。OK で back に戻る */
export function PbDialog({ pbs, back }: { pbs: (PbUpdate & { who?: string })[]; back: string }) {
  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[480px]">
      <div className="anim-fade absolute inset-0 bg-ink/50" />
      <section role="dialog" aria-label="PB 更新" className="absolute inset-x-7 top-[200px] flex flex-col items-center gap-2.5 rounded-[20px] bg-white px-5 pt-7 pb-5 text-center">
        <BigTrophyIcon className="text-warn" />
        <p className="m-0 text-[26px] font-bold text-warn">PB 更新！</p>
        {pbs.map((p) => (
          <div key={`${p.who ?? ""}${p.event}`}>
            <p className="m-0 text-base font-bold">
              {p.who && `${p.who}　`}
              {p.event}　{p.isWindAssisted && <RefMark small />}
              {showMark(p.mark)}
            </p>
            {p.diff != null && (
              <p className="m-0 text-sm text-sub">
                前の PB から {p.diff > 0 ? "+" : "−"}
                {kindOf(p.event) === "points" ? `${Math.round(Math.abs(p.diff))}点` : kindOf(p.event) === "distance" ? `${Math.abs(p.diff).toFixed(2)}m` : `${Math.abs(p.diff).toFixed(2)} 秒`}
              </p>
            )}
          </div>
        ))}
        <Link href={back} className="mt-2.5 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-white">
          OK
        </Link>
      </section>
    </div>
  );
}
