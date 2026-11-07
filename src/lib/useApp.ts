"use client";

import { useMemo } from "react";
import { todayStr } from "./dates";
import { useStore } from "./store";

/** 画面で使う基本の情報（データ全体・ログイン中の人・今日） */
export function useApp() {
  const snap = useStore();
  const today = useMemo(() => todayStr(), []);
  const db = snap?.db ?? null;
  const email = snap?.email ?? null;
  const me = db && email ? db.members[email] ?? null : null;
  return { db, email, me, today, ready: !!snap };
}
