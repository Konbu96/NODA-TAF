"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SubShell } from "@/components/Shell";
import { Card, chipOff, chipOn, Label, PrimaryButton } from "@/components/ui";
import { gradeOf, GRADES, graduationYearFor, ROLE_LABEL, type Grade } from "@/lib/grade";
import { canApprove, canChangeRole } from "@/lib/permissions";
import { approveMember, updateMember } from "@/lib/store";
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
  // 部員のページから来たときは、そこへ戻る
  const back = params.get("from") === "detail" ? `/members/detail?id=${encodeURIComponent(id)}` : "/members";
  return (
    <SubShell title="部員の編集" back={back}>
      {(ctx) => {
        if (!canApprove(ctx.me)) return <p className="text-sm text-sub">ここを使えるのは顧問・キャプテン・マネージャーだけです。</p>;
        const target = ctx.db.members[id];
        if (!target) return <p className="text-sm text-sub">部員が見つかりません。</p>;
        return <Form key={id} {...ctx} target={target} back={back} />;
      }}
    </SubShell>
  );
}

const ROLES: Role[] = ["member", "captain", "viceCaptain", "manager", "adviser"];

function Form({ me, today, target, back }: { db: DbState; me: Member; today: string; target: Member; back: string }) {
  const router = useRouter();
  const [name, setName] = useState(target.name);
  const [grade, setGrade] = useState<Grade | null>(gradeOf(target.graduationYear, today));
  const [role, setRole] = useState<Role>(target.role);
  const pending = target.status === "pending";
  const roleEditable = canChangeRole(me);
  const nameEditable = roleEditable || pending;

  const save = async () => {
    const graduationYear = role === "adviser" || !grade ? null : graduationYearFor(grade, today);
    if (pending) await approveMember(target.email, name.trim(), role === "adviser" ? null : grade, role);
    else if (roleEditable) await updateMember(target.email, { name: name.trim(), role, graduationYear });
    router.push(back);
  };

  return (
    <>
      <p className="m-0 px-1 text-xs text-muted">{target.email}</p>
      <h2 className="m-0 px-1 text-base font-bold">{pending ? "入部の申請" : "部員の編集"}</h2>

      <Card className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5">
          <Label>名前</Label>
          <input
            value={name}
            disabled={!nameEditable}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-[10px] border border-line px-3 text-base disabled:bg-hair"
          />
        </label>
      </Card>

      {role !== "adviser" && (
        <Card className="flex flex-col gap-2">
          <Label>学年</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {GRADES.map((g) => (
              <button key={g} disabled={!nameEditable} onClick={() => setGrade(g)} className={`h-10 rounded-[10px] text-sm ${grade === g ? chipOn : chipOff}`}>
                {g}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <Label>役職</Label>
        {!roleEditable && <p className="m-0 text-xs text-muted">役職を変えられるのは顧問だけです。</p>}
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <button key={r} disabled={!roleEditable} onClick={() => setRole(r)} className={`h-9 rounded-full px-3.5 text-[13px] ${role === r ? chipOn : chipOff}`}>
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </Card>

      {pending ? (
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button
            onClick={async () => {
              await updateMember(target.email, { status: "rejected" });
              router.push(back);
            }}
            className="h-[52px] rounded-xl border border-line bg-white text-[15px] text-danger"
          >
            通さない
          </button>
          <button onClick={save} disabled={!name.trim() || (role !== "adviser" && !grade)} className="h-[52px] rounded-xl bg-accent text-base font-bold text-white disabled:opacity-40">
            承認する
          </button>
        </div>
      ) : (
        <>
          <PrimaryButton onClick={save} disabled={!name.trim()}>
            保存する
          </PrimaryButton>
        </>
      )}

    </>
  );
}
