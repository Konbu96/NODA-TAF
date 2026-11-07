"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PencilIcon } from "@/components/icons";
import { MoodFace } from "@/components/MoodFace";
import { SubShell } from "@/components/Shell";
import { Card, Label, RefMark } from "@/components/ui";
import { monthLabel, nextMonth, shortDate } from "@/lib/dates";
import { reflectionStatus } from "@/lib/derived";
import { windLabel } from "@/lib/marks";
import { canEditProfileOf, canEditRecordsOf } from "@/lib/permissions";
import type { DbState, Member } from "@/lib/types";

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return (
    <SubShell
      title="部員"
      back="/members"
      right={({ me }) => (canEditProfileOf(me, id) ? <EditLink id={id} /> : null)}
    >
      {(ctx) => {
        const target = ctx.db.members[id];
        if (!target || target.status !== "approved") return <p className="text-sm text-sub">部員が見つかりません。</p>;
        return <Body {...ctx} target={target} />;
      }}
    </SubShell>
  );
}

function EditLink({ id }: { id: string }) {
  return (
    <Link href={`/profile/edit?id=${encodeURIComponent(id)}`} aria-label="プロフィールを直す" className="flex h-11 w-11 items-center justify-center text-white">
      <PencilIcon />
    </Link>
  );
}

function Body({ db, me, today, target }: { db: DbState; me: Member; today: string; target: Member }) {
  const [all, setAll] = useState(false);
  const month = reflectionStatus(db, me, today).month;
  const goal = db.goals[`${month}_${target.email}`]?.goal;
  const mood = db.moods[`${today}_${target.email}`];
  const records = Object.values(db.records)
    .filter((r) => r.memberId === target.email)
    .sort((a, b) => b.date.localeCompare(a.date));
  const shown = all ? records : records.slice(0, 5);
  const canRecords = canEditRecordsOf(me, target.email);

  return (
    <>
      <Card className="flex items-center gap-3">
        {mood ? <MoodFace kind={mood.mood} size={44} /> : <span className="h-11 w-11 rounded-full bg-hair" />}
        <div>
          <p className="m-0 text-lg font-bold">{target.name}</p>
          <p className="mt-0.5 mb-0 text-[13px] text-sub">
            {[target.bibNumber && `ゼッケン ${target.bibNumber}`, target.events.join(" / ")].filter(Boolean).join("・")}
          </p>
        </div>
      </Card>

      <Card className="py-3">
        <p className="m-0 text-xs text-sub">{monthLabel(nextMonth(month))}の目標</p>
        <p className={`mt-1 mb-0 text-[15px] font-bold ${goal ? "" : "text-warn-dark"}`}>{goal ?? "未提出"}</p>
      </Card>

      <Card className="flex flex-col gap-2">
        <Label>PB</Label>
        {target.personalBests.length === 0 && <p className="m-0 text-sm text-muted">まだありません</p>}
        {target.personalBests.map((p) => (
          <div key={p.event} className="flex justify-between text-[15px]">
            <span>{p.event}</span>
            <span>
              {p.isWindAssisted && <RefMark small />}
              {p.mark}
            </span>
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-2">
        <Label>スタブロのベスト</Label>
        <div className="grid grid-cols-3 gap-2 text-center">
          {(["30m", "60m", "80m"] as const).map((d) => (
            <div key={d}>
              <p className="m-0 text-xs text-sub">{d}</p>
              <p className="mt-0.5 mb-0 text-base font-bold">{target.stabroBests[d]?.toFixed(2) ?? "―"}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-2.5">
        <Label>大会記録</Label>
        {records.length === 0 && <p className="m-0 text-sm text-muted">まだありません</p>}
        {shown.map((r) => (
          <div key={r.id} className="flex items-end gap-2">
            <div className="grow">
              <p className="m-0 text-xs text-sub">
                {shortDate(r.date)} {r.meetName}
              </p>
              <p className="mt-0.5 mb-0 text-[15px]">
                {r.event}　{r.isWindAssisted && <RefMark small />}
                {r.mark}
                {r.wind != null && `（${windLabel(r.wind)}）`}
              </p>
            </div>
            {canRecords && (
              <Link href={`/records/edit?meet=${r.meetId}&member=${encodeURIComponent(target.email)}`} className="text-xs text-accent underline">
                直す
              </Link>
            )}
          </div>
        ))}
        {!all && records.length > 5 && (
          <button onClick={() => setAll(true)} className="h-10 text-[13px] text-accent underline">
            もっと見る（ほか {records.length - 5} 件）
          </button>
        )}
      </Card>
    </>
  );
}
