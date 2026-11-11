"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { badges } from "@/lib/derived";
import { isAthlete } from "@/lib/permissions";
import type { DbState, Member } from "@/lib/types";
import { USE_FIREBASE } from "@/lib/firebase";
import { useApp } from "@/lib/useApp";
import { BackIcon, HomeCloseIcon, ListIcon, PeopleIcon, PersonIcon, TrophyIcon } from "./icons";
import { Badge } from "./ui";

/** ログインと承認を確かめ、必要なら別の画面へ送る */
export function useGate(askMood = true) {
  const { db, me, email, today, ready } = useApp();
  const router = useRouter();
  const needMood = !!(db && me && isAthlete(me) && !db.moods[`${today}_${me.email}`]);
  let to: string | null = null;
  if (ready) {
    if (!email) to = "/login";
    // 本番：ログインはできたが、まだ入部申請をしていない人
    else if (!me) to = USE_FIREBASE ? "/apply" : "/login?noAccount=1";
    else if (me.status !== "approved") to = "/pending";
    else if (askMood && needMood) to = "/mood";
  }
  useEffect(() => {
    if (to) router.replace(to);
  }, [to, router]);
  const ok = ready && !to && db && me;
  return ok ? { db: db as DbState, me: me as Member, today } : null;
}

const SchoolName = () => (
  <div className="flex items-center gap-1">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/logo.png" alt="" width={30} height={22} className="h-auto w-[30px] shrink-0" />
    <p className="m-0 text-[10px] font-medium leading-[1.35] tracking-[0.04em]">
      野田学園
      <br />
      陸上競技部
    </p>
  </div>
);

type Tab = "menu" | "meets" | "members" | "mypage";

/** 丸ボタンのある画面（メニュー・大会・部員・マイページ） */
export function MainShell({ title, tab, children }: { title: string; tab: Tab; children: (ctx: { db: DbState; me: Member; today: string }) => ReactNode }) {
  const gate = useGate();
  const [navOpen, setNavOpen] = useState(false);
  const [navClosing, setNavClosing] = useState(false);
  // × で閉じるときは、上（外側）のボタンから順にホームボタンへ戻ってから消す
  const closeNav = () => {
    if (navClosing) return;
    setNavClosing(true);
    setTimeout(() => {
      setNavOpen(false);
      setNavClosing(false);
    }, 200 + 3 * 50);
  };
  if (!gate) return null;
  const { db, me, today } = gate;
  const b = badges(db, me, today);

  const navItems: { tab: Tab; href: string; label: string; icon: ReactNode; badge: number }[] = [
    { tab: "mypage", href: "/mypage", label: "マイページ", icon: <PersonIcon />, badge: b.reflection },
    { tab: "members", href: "/members", label: "部員", icon: <PeopleIcon />, badge: b.pending },
    { tab: "meets", href: "/meets", label: "大会", icon: <TrophyIcon />, badge: b.meets },
    { tab: "menu", href: "/", label: "メニュー", icon: <ListIcon />, badge: 0 },
  ];
  const anyBadge = navItems.some((n) => n.badge > 0 && n.tab !== tab);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 grid h-14 shrink-0 grid-cols-[96px_1fr_96px] items-center bg-accent pr-2 pl-3.5 text-white">
        <SchoolName />
        <h1 className="m-0 text-center text-lg font-bold tracking-[0.04em]">{title}</h1>
        <div />
      </header>

      <main className="flex grow flex-col gap-2.5 px-4 pt-3 pb-24">{children({ db, me, today })}</main>

      {navOpen && (
        <button aria-label="行き先を閉じる" onClick={closeNav} className="anim-fade fixed inset-0 z-30 mx-auto max-w-[480px] bg-ink/35" />
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px]">
        {navOpen && (
          <nav aria-label="画面の切り替え" className="pointer-events-auto absolute right-5 bottom-24 flex flex-col items-end gap-2.5">
            {navItems.map((n, i) => {
              // 下のボタンから順に、少しずつ遅らせて下から出てくる
              // 閉じるときは逆に、上のボタンから順に戻る
              const pop = { animationDelay: navClosing ? `${i * 50}ms` : `${(navItems.length - 1 - i) * 60}ms` };
              const cls = `${navClosing ? "nav-back" : "nav-pop"} relative flex h-12 items-center gap-2.5 rounded-3xl pr-[18px] pl-3.5 text-[15px] font-bold shadow-[0_4px_14px_rgba(15,23,42,0.18)]`;
              const body = (
                <>
                  <span className="text-accent">{n.icon}</span>
                  {n.label}
                  {n.badge > 0 && <Badge n={n.badge} className="absolute -top-1 -right-1" />}
                </>
              );
              return n.tab === tab ? (
                <button key={n.tab} onClick={closeNav} style={pop} className={`${cls} bg-accent-soft text-accent`}>
                  {body}
                </button>
              ) : (
                <Link key={n.tab} href={n.href} style={pop} className={`${cls} bg-white text-ink`}>
                  {body}
                </Link>
              );
            })}
          </nav>
        )}
        <button
          onClick={() => (navOpen ? closeNav() : setNavOpen(true))}
          aria-label={navOpen ? "行き先を閉じる" : "行き先を開く"}
          className="pointer-events-auto absolute right-5 bottom-6 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent text-white shadow-[0_6px_18px_rgba(30,58,138,0.4)]"
        >
          <HomeCloseIcon open={navOpen && !navClosing} />
          {!navOpen && anyBadge && <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-warn" />}
        </button>
      </div>
    </div>
  );
}

/** 戻るボタンのある画面 */
export function SubShell({
  title, back, right, children,
}: {
  title: string;
  back: string;
  right?: (ctx: { db: DbState; me: Member; today: string }) => ReactNode;
  children: (ctx: { db: DbState; me: Member; today: string }) => ReactNode;
}) {
  const gate = useGate();
  if (!gate) return null;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 grid h-14 shrink-0 grid-cols-[96px_1fr_96px] items-center bg-accent pr-2 pl-1.5 text-white">
        <Link href={back} aria-label="戻る" className="flex h-11 w-11 items-center justify-center text-white">
          <BackIcon />
        </Link>
        <h1 className="m-0 text-center text-lg font-bold">{title}</h1>
        <div className="flex justify-end">{right?.(gate)}</div>
      </header>
      <main className="flex grow flex-col gap-3 px-4 pt-3 pb-6">{children(gate)}</main>
    </div>
  );
}

/** ログイン前の画面の上の帯 */
export function PlainHeader({ title }: { title?: string }) {
  return (
    <div className="grid h-14 shrink-0 grid-cols-[96px_1fr_96px] items-center bg-accent pr-2 pl-3.5 text-white">
      <SchoolName />
      {title ? <h1 className="m-0 text-center text-lg font-bold">{title}</h1> : <span />}
      <span />
    </div>
  );
}

