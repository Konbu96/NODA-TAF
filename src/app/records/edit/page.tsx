"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// 記録の入力は、大会の個人の画面（/meets/entry）にまとめた。前のアドレスから来たときはそちらへ移す

export default function Page() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}

function Redirect() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const meet = params.get("meet");
    const member = params.get("member");
    router.replace(meet ? `/meets/entry?id=${meet}${member ? `&member=${encodeURIComponent(member)}` : ""}` : "/meets");
  }, [params, router]);
  return null;
}
