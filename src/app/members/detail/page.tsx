"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MoodFace, NoMoodFace } from "@/components/MoodFace";
import { SubShell } from "@/components/Shell";
import { Card, Confirm, Label, RefMark, EditButton, RoleTag } from "@/components/ui";
import { monthLabel, nextMonth, shortDate } from "@/lib/dates";
import { reflectionStatus } from "@/lib/derived";
import { ALL_EVENTS, windLabel, showMark } from "@/lib/marks";
import { ROLE_LABEL } from "@/lib/grade";
import { canEditProfileOf, canRemove, hasEvents, showResultEditOf, writesReflection } from "@/lib/permissions";
import { removeMember } from "@/lib/store";
import { legalBestIfRef } from "@/lib/pb";
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
    <SubShell title="部員" back="/members">
      {(ctx) => {
        const target = ctx.db.members[id];
        if (!target || target.status !== "approved") return <p className="text-sm text-sub">部員が見つかりません。</p>;
        return <Body {...ctx} target={target} />;
      }}
    </SubShell>
  );
}

function EditLink({ id }: { id: string }) {
  return <EditButton href={`/profile/edit?id=${encodeURIComponent(id)}`} ariaLabel="プロフィールを編集" />;
}

function Body({ db, me, today, target }: { db: DbState; me: Member; today: string; target: Member }) {
  const [all, setAll] = useState(false);
  const [askRemove, setAskRemove] = useState(false);
  const router = useRouter();
  const month = reflectionStatus(db, me, today).month;
  const goal = db.goals[`${month}_${target.email}`]?.goal;
  const mood = db.moods[`${today}_${target.email}`];
  const records = Object.values(db.records)
    .filter((r) => r.memberId === target.email)
    .sort((a, b) => b.date.localeCompare(a.date));
  // 大会ごとにまとめる（新しい大会が上、種目は種目の順）。
  // 同じ名前で日にちが重なる大会（同じ大会を 2 回登録したときなど）は 1 つにまとめる
  type Group = { meetIds: string[]; name: string; start: string; end: string; list: typeof records };
  const groups: Group[] = [];
  for (const r of records) {
    const meet = db.meets[r.meetId];
    const name = (meet?.name ?? r.meetName).trim();
    const start = meet?.startDate ?? r.date;
    const end = meet?.endDate || start;
    const g = groups.find((x) => x.name === name && start <= x.end && end >= x.start);
    if (g) {
      if (!g.meetIds.includes(r.meetId)) g.meetIds.push(r.meetId);
      if (start < g.start) g.start = start;
      if (end > g.end) g.end = end;
      g.list.push(r);
    } else groups.push({ meetIds: [r.meetId], name, start, end, list: [r] });
  }
  for (const g of groups) g.list.sort((a, b) => ALL_EVENTS.indexOf(a.event) - ALL_EVENTS.indexOf(b.event));
  const dateLabel = (g: Group) => (g.end !== g.start ? `${shortDate(g.start)}〜${shortDate(g.end)}` : shortDate(g.start));
  const shown = all ? groups : groups.slice(0, 5);
  const canRecords = showResultEditOf(me, target.email);

  return (
    <>
      <Card className="flex items-center gap-3">
        {mood ? <MoodFace kind={mood.mood} size={44} /> : <NoMoodFace size={44} />}
        <div className="min-w-0 grow">
          <p className="m-0 flex items-center gap-2 text-lg font-bold">
            {target.name}
            <RoleTag label={ROLE_LABEL[target.role]} />
          </p>
          {hasEvents(target) && target.bibNumber && <p className="mt-0.5 mb-0 text-[13px] text-sub">ゼッケン {target.bibNumber}</p>}
          {target.restDay && <p className="mt-0.5 mb-0 text-xs text-muted">休み {target.restDay}</p>}
        </div>
        {canEditProfileOf(me, target.email) && <EditLink id={target.email} />}
      </Card>

      {/* 目標・PB・スタブロ・大会記録は 1 つの白い枠にまとめて、薄い線で区切る */}
      <section className="flex flex-col divide-y divide-divider rounded-xl bg-white px-4">
        {writesReflection(target) && (
          <Box className="py-3">
            <p className="m-0 text-xs text-sub">{monthLabel(nextMonth(month))}の目標</p>
            <p className={`mt-1 mb-0 text-[15px] font-bold ${goal ? "" : "text-warn-dark"}`}>{goal ?? "未提出"}</p>
          </Box>
        )}

        {hasEvents(target) && (
          <Box className="flex flex-col gap-2">
            <Label>PB</Label>
            {target.personalBests.length === 0 && <p className="m-0 text-sm text-muted">まだありません</p>}
            {target.personalBests.map((p) => (
              // 大会記録と同じく、種目の幅をそろえて記録を左でそろえる
              <div key={p.event} className="flex text-[15px]">
                <span className="w-24 shrink-0">{p.event}</span>
                <span className="flex flex-col items-start">
                  <span>
                    {p.isWindAssisted && <RefMark small />}
                    {showMark(p.mark)}
                  </span>
                  {legalBestIfRef(db, target, p.event) && <span className="text-xs text-muted">公認：{showMark(legalBestIfRef(db, target, p.event)?.mark ?? "")}</span>}
                </span>
              </div>
            ))}
          </Box>
        )}

        <Box className="flex flex-col gap-2">
          <Label>スタブロのベスト</Label>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["30m", "60m", "80m"] as const).map((d) => (
              <p key={d} className="m-0 text-[15px]">
                <span className="text-sub">{d}：</span>
                <b>{target.stabroBests[d]?.toFixed(2) ?? "―"}</b>
              </p>
            ))}
          </div>
        </Box>

        <Box className="flex flex-col gap-2.5">
          <Label>大会記録</Label>
          {records.length === 0 && <p className="m-0 text-sm text-muted">まだありません</p>}
          {shown.map((g) => (
            <div key={g.meetIds[0]}>
              <p className="m-0 flex items-center gap-2 text-xs text-sub">
                <span className="grow">
                  {dateLabel(g)} {g.name}
                </span>
                {canRecords && (
                  <EditButton small href={`/records/edit?meet=${g.meetIds[0]}&member=${encodeURIComponent(target.email)}`} ariaLabel={`${g.name}の記録を編集`} />
                )}
              </p>
              {g.list.map((r) => (
                // 種目の幅をそろえて、記録の書き出しを左でそろえる
                <p key={r.id} className="mt-0.5 mb-0 flex text-[15px]">
                  <span className="w-24 shrink-0">{r.event}</span>
                  <span>
                    {r.isWindAssisted && <RefMark small />}
                    {showMark(r.mark)}
                    {r.wind != null && `（${windLabel(r.wind)}）`}
                  </span>
                </p>
              ))}
            </div>
          ))}
          {!all && groups.length > 5 && (
            <button onClick={() => setAll(true)} className="h-10 text-[13px] text-accent underline">
              もっと見る（ほか {groups.length - 5} 大会）
            </button>
          )}
        </Box>
      </section>

      {/* 削除（顧問・キャプテン・マネージャー）。その人の記録や振り返りも消える */}
      {canRemove(me, target) &&
        (askRemove ? (
          <Confirm
            danger
            title={`${target.name} を削除しますか？`}
            note="記録や振り返りも消え、元に戻せません"
            okLabel="削除する"
            onCancel={() => setAskRemove(false)}
            onOk={async () => {
              await removeMember(target.email);
              router.push("/members");
            }}
          />
        ) : (
          // 文字の上だけ押せるようにする（まわりの余白は押しても反応しない）
          <button onClick={() => setAskRemove(true)} className="my-3 self-center p-0 text-[13px] leading-none text-danger underline">
            この部員を削除する
          </button>
        ))}
    </>
  );
}

/** 白い枠の中の 1 つの欄（欄どうしは薄い線で区切る） */
function Box({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`py-3.5 ${className}`}>{children}</div>;
}
