"use client";

import { HomeTemplate } from "@/components/templates/HomeTemplate";
import { useHomeScreen } from "@/hooks/useHomeScreen";

/**
 * アプリのルート画面（Atomic Design の pages 層）。
 * ロジックは `useHomeScreen`（状態機械・CRUD 協調）に、描画は `HomeTemplate`（templates 層）に委ね、
 * この層は両者を接続するだけの薄いシェルに徹する。
 */
export default function Page() {
  return <HomeTemplate {...useHomeScreen()} />;
}
