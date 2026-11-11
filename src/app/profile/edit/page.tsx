"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Chip, chipOff, chipOn, Label, PrimaryButton, Sheet } from "@/components/ui";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { gradeOf, ROLE_LABEL } from "@/lib/grade";
import { EVENT_GROUPS, liveMark, markToDigits, onlyDigits, showMark } from "@/lib/marks";
import { pbEvents } from "@/lib/pb";
import { canChangeRole, canEditProfileOf, hasEvents, isAthlete } from "@/lib/permissions";
import { saveProfile, updateMember } from "@/lib/store";
import type { DbState, Member, Role } from "@/lib/types";

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <SubShell title="プロフィール" back={id ? `/members/detail?id=${encodeURIComponent(id)}` : "/mypage"}>
      {({ db, me, today }) => {
        const target = db.members[id || me.email];
        if (!target) return <p className="text-sm text-sub">部員が見つかりません。</p>;
        if (!canEditProfileOf(me, target.email)) return <p className="text-sm text-sub">この人のプロフィールは直せません。</p>;
        return <Form key={target.email} db={db} target={target} me={me} today={today} />;
      }}
    </SubShell>
  );
}

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const ROLES: Role[] = ["member", "captain", "viceCaptain", "manager", "adviser"];

function Form({ target, me, today }: { db: DbState; target: Member; me: Member; today: string }) {
  const [role, setRole] = useState<Role>(target.role);
  const [bib, setBib] = useState(target.bibNumber);
  const [restDay, setRestDay] = useState(target.restDay ?? "");
  // PB：出たことのある種目ごとに、今の PB（手入力があればそれ）を入れておく
  const [pbs, setPbs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      pbEvents(target).map((ev) => {
        const p = target.personalBests.find((x) => x.event === ev);
        return [ev, markToDigits(p?.manualMark || "")];
      }),
    ),
  );
  const [addSheet, setAddSheet] = useState(false);
  const router = useRouter();
  const self = me.email === target.email;
  // マネージャー・顧問には、ゼッケンの欄を出さない
  const athlete = hasEvents({ ...target, role });
  // 役職を変えられるのは顧問・開発者だけ
  const roleEditable = canChangeRole(me);

  return (
    <>
      <section className="px-1 py-0.5">
        <p className="m-0 text-lg font-bold">{target.name}</p>
        <p className="mt-0.5 mb-0 text-[13px] text-muted">{gradeOf(target.graduationYear, today)}</p>
      </section>

      {roleEditable && (
        <Card className="flex flex-col gap-2">
          <Label>役職</Label>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`h-9 rounded-full px-3.5 text-[13px] ${role === r ? chipOn : chipOff}`}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </Card>
      )}

      {athlete && (
        <Card className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5">
            <Label>ゼッケン</Label>
            <input
              inputMode="numeric"
              value={bib}
              onChange={(e) => setBib(onlyDigits(e.target.value, 5))}
              className="h-11 w-[120px] rounded-[10px] border border-line px-3 text-base"
            />
          </label>
        </Card>
      )}

      {/* 顧問は休みの曜日を持たない */}
      {isAthlete({ ...target, role }) && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>休みの曜日</Label>
            {/* 7 つを 1 段に、画面のはばに合わせて並べる */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <Chip key={d} on={restDay === `${d}曜日`} onClick={() => setRestDay(restDay === `${d}曜日` ? "" : `${d}曜日`)} className="w-full justify-center px-0">
                  {d}
                </Chip>
              ))}
            </div>
          </div>
        </Card>
      )}

      {athlete && (
        <Card className="flex flex-col gap-1">
          <Label>PB</Label>
          <p className="mt-0 mb-0.5 text-xs font-bold text-sub">数字のみで入力してください（例：1205 → 12.05）</p>
          <p className="mt-0 mb-1 text-[11px] text-muted">大会の記録から自動で入ります。アプリを使う前のベストは、ここに手で入れてください。</p>
          {Object.keys(pbs).length === 0 && <p className="m-0 text-sm text-muted">まだありません</p>}
          {Object.entries(pbs).map(([ev, d]) => {
            const recordPb = target.personalBests.find((p) => p.event === ev && p.recordId);
            return (
              <div key={ev} className="flex min-h-14 items-center gap-2.5 border-t border-hair py-1.5">
                <b className="w-24 shrink-0 text-[15px]">{ev}</b>
                <div className="flex min-w-0 grow flex-col gap-0.5">
                  <input
                    inputMode="numeric"
                    placeholder="数字のみ入力"
                    value={liveMark(ev, d)}
                    onChange={(e) => setPbs({ ...pbs, [ev]: onlyDigits(e.target.value) })}
                    aria-label={`${ev} の PB`}
                    className="h-11 w-full rounded-[10px] border border-line px-3 text-base"
                  />
                  {recordPb && <span className="text-xs text-accent">大会の PB：{showMark(recordPb.mark)}</span>}
                </div>
                {!recordPb && (
                  <button
                    onClick={() => setPbs(Object.fromEntries(Object.entries(pbs).filter(([k]) => k !== ev)))}
                    aria-label={`${ev} の PB を消す`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center text-[#94A3B8]"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            );
          })}
          <button onClick={() => setAddSheet(true)} className="mt-1.5 flex items-center gap-1.5 self-center rounded-full bg-accent-soft px-5 py-2.5 text-sm font-bold text-accent">
            <PlusIcon />
            PB を追加
          </button>
        </Card>
      )}

      <Sheet open={addSheet} onClose={() => setAddSheet(false)} title="どの種目の PB？">
        {EVENT_GROUPS.map((g) => {
          const list = g.events.filter((e) => !(e in pbs));
          if (!list.length) return null;
          return (
            <div key={g.name}>
              <p className="mt-0 mb-1.5 text-xs font-bold text-sub">{g.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((e) => (
                  <Chip
                    key={e}
                    small
                    on={false}
                    onClick={() => {
                      setPbs({ ...pbs, [e]: "" });
                      setAddSheet(false);
                    }}
                  >
                    {e}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}
      </Sheet>

      <PrimaryButton
        onClick={async () => {
          await saveProfile(target.email, { bibNumber: bib, gender: target.gender ?? "", restDay }, target.events, pbs);
          if (roleEditable && role !== target.role) await updateMember(target.email, { role });
          // 保存したら、来た画面に戻る
          router.push(self ? "/mypage" : `/members/detail?id=${encodeURIComponent(target.email)}`);
        }}
      >
        保存する
      </PrimaryButton>
    </>
  );
}
