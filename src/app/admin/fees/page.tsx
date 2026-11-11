"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SubShell } from "@/components/Shell";
import { PrimaryButton } from "@/components/ui";
import { onlyDigits } from "@/lib/marks";
import { canEditFees } from "@/lib/permissions";
import { saveFees } from "@/lib/store";
import type { DbState } from "@/lib/types";

export default function FeesPage() {
  return (
    <SubShell title="競技場代" back="/">
      {(ctx) => (canEditFees(ctx.me) ? <Body db={ctx.db} /> : <p className="text-sm text-sub">料金を変えられるのは顧問だけです。</p>)}
    </SubShell>
  );
}

const yen = "h-11 w-24 rounded-[10px] border border-line px-3 text-right text-lg font-bold";

function Body({ db }: { db: DbState }) {
  const [jr, setJr] = useState(String(db.fees.juniorHigh));
  const [hs, setHs] = useState(String(db.fees.highSchool));
  const [wt, setWt] = useState(String(db.fees.winterExtra));
  const router = useRouter();
  const n = (v: string) => Number(v || 0);

  const row = (label: string, value: string, set: (v: string) => void, plus?: boolean, first?: boolean) => (
    <label className={`flex min-h-[60px] items-center gap-2 ${first ? "" : "border-t border-hair"}`}>
      <span className="grow text-[15px]">{label}</span>
      {plus && <span className="text-[15px] text-muted">＋</span>}
      <input inputMode="numeric" value={value} onChange={(e) => set(onlyDigits(e.target.value, 5))} className={yen} />
      <span className="text-[15px]">円</span>
    </label>
  );

  return (
    <>
      <section className="rounded-xl bg-white px-4 py-1">
        {row("中学生", jr, setJr, false, true)}
        {row("高校生", hs, setHs)}
        {row("冬季の追加", wt, setWt, true)}
      </section>
      <section className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 rounded-xl bg-white px-4 py-3 text-[13px] text-sub">
        <span />
        <span className="font-bold">ふだん</span>
        <span className="font-bold">冬季</span>
        <span>中学生</span>
        <span className="text-right">{n(jr)}円</span>
        <span className="text-right">{n(jr) + n(wt)}円</span>
        <span>高校生</span>
        <span className="text-right">{n(hs)}円</span>
        <span className="text-right">{n(hs) + n(wt)}円</span>
      </section>
      <PrimaryButton
        onClick={async () => {
          await saveFees({ juniorHigh: n(jr), highSchool: n(hs), winterExtra: n(wt) });
          router.push("/");
        }}
      >
        保存する
      </PrimaryButton>
    </>
  );
}
