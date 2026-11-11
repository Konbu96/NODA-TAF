"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PencilIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { Card, Chip, Confirm, Label, PrimaryButton, Sheet, Stepper, EditButton } from "@/components/ui";
import { dayLabel, diffDays } from "@/lib/dates";
import { itemSummary, needsDetail } from "@/lib/menuText";
import { canEditMenu } from "@/lib/permissions";
import { deleteMenu, saveMenu } from "@/lib/store";
import type { DbState, MenuItem, Member } from "@/lib/types";

export default function Page() {
  return (
    <Suspense>
      <SubShell title="メニューの編集" back="/">
        {(ctx) => <Editor {...ctx} />}
      </SubShell>
    </Suspense>
  );
}

function Editor({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const params = useSearchParams();
  const date = params.get("date") ?? today;
  if (!canEditMenu(me)) return <p className="text-sm text-sub">メニューを編集できるのは担当者だけです。</p>;
  const off = diffDays(date, today);
  if (off < -1 || off > 7) return <p className="text-sm text-sub">前日から 1 週間後までのメニューだけ登録できます。</p>;
  return <Form key={date} db={db} me={me} date={date} />;
}

function Form({ db, me, date }: { db: DbState; me: Member; date: string }) {
  const router = useRouter();
  const existing = db.menus[date];
  const [place, setPlace] = useState(existing?.place ?? "学校");
  const [warm, setWarm] = useState<string[]>(existing?.warmUp ?? []);
  const [items, setItems] = useState<MenuItem[]>(existing?.items ?? []);
  const [note, setNote] = useState(existing?.note ?? "");
  const [editing, setEditing] = useState(-1);
  const [askDelete, setAskDelete] = useState(false);
  const o = db.options;

  const toggleType = (type: string) => {
    const i = items.findIndex((x) => x.type === type);
    if (i >= 0) setItems(items.filter((_, j) => j !== i));
    else {
      const next = [...items, { type, distance: "", reps: 0, sets: 0, memo: "" }];
      setItems(next);
      if (needsDetail(type)) setEditing(next.length - 1);
    }
  };
  const patch = (i: number, p: Partial<MenuItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const cur = editing >= 0 ? items[editing] : null;

  const save = async () => {
    await saveMenu({ date, place, warmUp: warm, items, note }, me.email);
    router.push("/");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <p className="m-0 grow text-base font-bold">{dayLabel(date)}</p>
        {/* 場所・アップ・練習の種類・距離を増やす・消す */}
        <EditButton href={`/admin/options?date=${date}`} label="種類を編集" />
      </div>

      <Card className="flex flex-col gap-2">
        <Label>場所</Label>
        <div className="flex flex-wrap gap-1.5">
          {o.places.map((p) => (
            <Chip key={p} on={place === p} onClick={() => setPlace(p)} className="h-[38px] px-4 text-sm">
              {p}
            </Chip>
          ))}
        </div>
        {place === "競技場" && <p className="m-0 text-xs text-accent">競技場の日になります（部員に「行く／行かない」が出ます）</p>}
      </Card>

      <Card className="flex flex-col gap-2">
        <Label>アップ</Label>
        <div className="flex flex-wrap gap-1.5">
          {o.warmUps.map((w) => (
            <Chip key={w} on={warm.includes(w)} onClick={() => setWarm(warm.includes(w) ? warm.filter((x) => x !== w) : [...warm, w])}>
              {w}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-2.5">
        <Label>メニュー</Label>
        <div className="flex flex-wrap gap-1.5">
          {o.types.map((t) => {
            const i = items.findIndex((x) => x.type === t);
            return (
              <Chip key={t} on={i >= 0} onClick={() => toggleType(t)}>
                {i >= 0 ? `${i + 1}. ${t}` : t}
              </Chip>
            );
          })}
        </div>
        <div className="flex flex-col">
          {items.map((it, i) =>
            needsDetail(it.type) ? (
              <button key={i} onClick={() => setEditing(i)} className="flex min-h-12 items-center gap-2 border-t border-divider px-1 text-left">
                <span className="grow text-sm">
                  <b>
                    {i + 1}. {it.type}
                  </b>
                  {"　"}
                  {itemSummary(it) || it.memo ? (
                    <span className="text-sub">{[itemSummary(it), it.memo].filter(Boolean).join("、")}</span>
                  ) : (
                    <span className="text-warn">距離・本数を設定</span>
                  )}
                </span>
                <PencilIcon size={16} className="text-accent" />
              </button>
            ) : null,
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <Label>連絡</Label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：スパイク持参"
            className="resize-none rounded-lg border border-line p-2.5 text-sm"
          />
        </label>
      </Card>

      <PrimaryButton onClick={save}>保存する</PrimaryButton>
      {existing &&
        (askDelete ? (
          <Confirm
            danger
            title="この日のメニューを消しますか？"
            okLabel="消す"
            onCancel={() => setAskDelete(false)}
            onOk={async () => {
              await deleteMenu(date);
              router.push("/");
            }}
          />
        ) : (
          <button onClick={() => setAskDelete(true)} className="h-10 text-[13px] text-danger underline">
            この日のメニューを消す
          </button>
        ))}

      <Sheet open={!!cur} onClose={() => setEditing(-1)} title={cur ? `${editing + 1}. ${cur.type}` : ""}>
        {cur && (
          <>
            <div>
              <p className="mt-0 mb-1.5 text-xs font-bold text-sub">距離</p>
              <div className="flex flex-wrap gap-1.5">
                {["", ...o.distances].map((d) => (
                  <Chip key={d || "none"} small on={cur.distance === d} onClick={() => patch(editing, { distance: d })}>
                    {d || "なし"}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="mt-0 mb-1.5 text-xs font-bold text-sub">本数</p>
                <Stepper label="本数" value={cur.reps} onChange={(v) => patch(editing, { reps: v })} />
              </div>
              <div>
                <p className="mt-0 mb-1.5 text-xs font-bold text-sub">セット</p>
                <Stepper label="セット数" value={cur.sets} onChange={(v) => patch(editing, { sets: v })} />
              </div>
            </div>
            <input
              type="text"
              value={cur.memo}
              onChange={(e) => patch(editing, { memo: e.target.value })}
              placeholder="補足（例：レスト 3分）"
              className="h-11 rounded-[10px] border border-line px-3 text-sm"
            />
            <PrimaryButton onClick={() => setEditing(-1)}>決定</PrimaryButton>
          </>
        )}
      </Sheet>

    </>
  );
}

