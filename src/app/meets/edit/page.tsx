"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, Confirm, Label, PrimaryButton } from "@/components/ui";
import { canEditMenu } from "@/lib/permissions";
import { deleteMeet, saveMeet } from "@/lib/store";
import type { DbState, Meet, Member } from "@/lib/types";

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
    <SubShell title={id ? "大会情報の編集" : "大会の登録"} back={id ? `/meets/detail?id=${id}` : "/meets"}>
      {(ctx) => {
        if (!canEditMenu(ctx.me)) return <p className="text-sm text-sub">大会を登録できるのは担当者だけです。</p>;
        const meet = id ? ctx.db.meets[id] : undefined;
        if (id && !meet) return <p className="text-sm text-sub">大会が見つかりません。</p>;
        return <Form key={id} {...ctx} meet={meet} />;
      }}
    </SubShell>
  );
}

const input = "h-11 w-full rounded-[10px] border border-line bg-white px-3 text-base";

function Form({ me, today, meet }: { db: DbState; me: Member; today: string; meet?: Meet }) {
  const router = useRouter();
  const [name, setName] = useState(meet?.name ?? "");
  const [start, setStart] = useState(meet?.startDate ?? today);
  const [end, setEnd] = useState(meet?.endDate ?? meet?.startDate ?? today);
  const [venue, setVenue] = useState(meet?.venue ?? "");
  const [url, setUrl] = useState(meet?.guidelineUrl ?? "");
  const [askDelete, setAskDelete] = useState(false);
  const ok = name.trim() && start;

  return (
    <>
      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <Label>大会名</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：秋季記録会" className={input} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1.5">
            <Label>開始日</Label>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (!end || end < e.target.value) setEnd(e.target.value);
              }}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <Label>終了日</Label>
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={input} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <Label>会場</Label>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="例：下関陸上競技場" className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <Label>出場要項のリンク</Label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={input} />
        </label>
      </Card>

      <PrimaryButton
        disabled={!ok}
        onClick={async () => {
          const id = await saveMeet(
            { id: meet?.id ?? "", name: name.trim(), startDate: start, endDate: end || start, venue: venue.trim(), guidelineUrl: url.trim() },
            me.email,
          );
          router.push(`/meets/detail?id=${id}`);
        }}
      >
        保存する
      </PrimaryButton>

      {meet &&
        (askDelete ? (
          <Confirm
            danger
            title="この大会を消しますか？"
            note="エントリーも消えます。入力済みの記録は残ります。"
            okLabel="消す"
            onCancel={() => setAskDelete(false)}
            onOk={async () => {
              await deleteMeet(meet.id);
              router.push("/meets");
            }}
          />
        ) : (
          <button onClick={() => setAskDelete(true)} className="h-10 text-[13px] text-danger underline">
            この大会を消す
          </button>
        ))}
    </>
  );
}
