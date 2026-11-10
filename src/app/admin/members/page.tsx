"use client";

import Link from "next/link";
import { useState } from "react";
import { DownIcon, NextIcon, PlusIcon } from "@/components/icons";
import { SubShell } from "@/components/Shell";
import { approvedMembers, pendingMembers } from "@/lib/derived";
import { gradeOf, GRADES, ROLE_LABEL, sortMembers } from "@/lib/grade";
import { canApprove, canRemove } from "@/lib/permissions";
import { removeMember } from "@/lib/store";
import { Confirm } from "@/components/ui";
import type { DbState, Member } from "@/lib/types";

export default function RosterPage() {
  return (
    <SubShell title="部員名簿" back="/members">
      {(ctx) => (canApprove(ctx.me) ? <Body {...ctx} /> : <p className="text-sm text-sub">部員名簿を使えるのは顧問・キャプテン・マネージャーだけです。</p>)}
    </SubShell>
  );
}

const editHref = (m: Member) => `/admin/members/edit?id=${encodeURIComponent(m.email)}`;

function Body({ db, me, today }: { db: DbState; me: Member; today: string }) {
  const [open, setOpen] = useState("高2");
  const [removing, setRemoving] = useState("");
  const pending = pendingMembers(db);
  const members = sortMembers(approvedMembers(db), today);
  const groups = [
    { name: "顧問", people: members.filter((m) => m.role === "adviser") },
    ...[...GRADES].reverse().map((g) => ({ name: g, people: members.filter((m) => m.role !== "adviser" && gradeOf(m.graduationYear, today) === g) })),
  ].filter((g) => g.people.length);

  return (
    <>
      <Link href="/admin/members/add" className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-accent-soft text-[15px] font-bold text-accent">
        <PlusIcon />
        部員を登録する
      </Link>

      {pending.length > 0 && (
        <section className="rounded-xl border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] px-4 pt-3 pb-1">
          <p className="mt-0 mb-1 text-[13px] font-bold text-danger">承認待ち（{pending.length}件）</p>
          {pending.map((m) => (
            <Link key={m.email} href={editHref(m)} className="flex min-h-12 items-center gap-2 border-t border-[#FEE2E2] text-[15px]">
              <span className="grow">{m.name}</span>
              <span className="text-[13px] text-muted">{gradeOf(m.graduationYear, today)}</span>
              <NextIcon className="text-danger" />
            </Link>
          ))}
        </section>
      )}

      {groups.map((g) => (
        <section key={g.name} className="rounded-xl bg-white px-4">
          <button onClick={() => setOpen(open === g.name ? "" : g.name)} aria-expanded={open === g.name} className="flex min-h-12 w-full items-center gap-2 text-left">
            <b className="grow text-[15px]">
              {g.name}（{g.people.length}人）
            </b>
            <DownIcon className={`text-[#94A3B8] transition-transform ${open === g.name ? "rotate-180" : ""}`} />
          </button>
          {open === g.name && (
            <div className="pb-1">
              {g.people.map((m) =>
                removing === m.email ? (
                  <div key={m.email} className="border-t border-hair py-2">
                    <Confirm
                      danger
                      title={`${m.name} を削除しますか？`}
                      note="記録や振り返りも消え、元に戻せません"
                      okLabel="削除する"
                      onCancel={() => setRemoving("")}
                      onOk={async () => {
                        await removeMember(m.email);
                        setRemoving("");
                      }}
                    />
                  </div>
                ) : (
                  <div key={m.email} className="flex min-h-12 items-center gap-2 border-t border-hair text-[15px]">
                    <span className="grow">{m.name}</span>
                    {m.role !== "member" && m.role !== "adviser" && (
                      <span className="rounded-[10px] bg-accent-soft px-2 py-0.5 text-[11px] text-accent">{ROLE_LABEL[m.role]}</span>
                    )}
                    {m.isAdmin && <span className="rounded-[10px] bg-hair px-2 py-0.5 text-[11px] text-sub">開発者</span>}
                    {canRemove(me, m) && (
                      <button onClick={() => setRemoving(m.email)} className="h-9 px-2 text-[13px] text-danger underline">
                        削除
                      </button>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
