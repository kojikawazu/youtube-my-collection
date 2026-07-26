import type React from "react";
import type { Screen, SortOption, VideoItem } from "@/types";
import type { ValidationErrors } from "@/types/validation";

/**
 * トップ画面テンプレート（`HomeTemplate`）が必要とするすべての入力。
 * `useHomeScreen` の戻り値でもあり、`page.tsx` が `<HomeTemplate {...useHomeScreen()} />` で接続する。
 * テンプレートは状態を持たないため、表示に必要な値と操作関数をすべてここで受け取る。
 *
 * hooks（`useHomeScreen`）と components（`HomeTemplate`）の双方から参照されるため `types/` に置く。
 * どちらか一方に定義すると hooks → components の逆流が生じる（`frontend.md`「レイヤ依存の一方向ルール」）。
 */
export type HomeTemplateProps = {
  // --- 画面状態 ---

  /** 現在表示している画面。1 度に 1 つだけ表示する */
  currentScreen: Screen;
  /** 詳細・編集の対象。一覧／ログイン／追加画面では `null` */
  selectedVideo: VideoItem | null;
  /** 管理者として認証済みか。false の間は追加・編集・削除の導線を出さない */
  isAdmin: boolean;

  // --- ナビゲーション/認証（Header・戻り導線） ---

  /** 一覧画面へ戻す。ログアウト後の遷移先でもある */
  onNavigateList: () => void;
  /** ログイン画面を開く（この時点では認証は走らない） */
  onLogin: () => void;
  /** ログアウトして一覧画面へ戻す */
  onLogout: () => void;
  /** Google OAuth を開始する。成功時は外部へリダイレクトするため復帰しない */
  onGoogleLogin: () => void;

  // --- 一覧（VideoList） ---

  /** 現在ページの動画。0 件は「該当なし」であり「未取得」ではない（未取得は `isLoading`） */
  videos: VideoItem[];
  /** 検索欄の入力値。実際の取得は 300ms デバウンス後に走る */
  searchQuery: string;
  /** 検索欄の入力を反映する。変更すると 1 ページ目へ戻る */
  onSearchChange: (value: string) => void;
  /** 現在の並び順 */
  sortOption: SortOption;
  /** 並び順を変更する。変更すると 1 ページ目へ戻る */
  onSortChange: (value: SortOption) => void;
  /** 一覧を取得中か。true の間はスケルトンを表示する */
  isLoading: boolean;
  /** 取得に失敗した理由。成功時は `null` */
  loadError: string | null;
  /** 検索・並び替え適用後の総件数（現在ページの件数ではない） */
  totalCount: number;
  /** 現在のページ番号。1 始まり */
  currentPage: number;
  /** 総ページ数。0 件でも 1 を返す（空ページを表示しないため） */
  totalPages: number;
  /** ページ番号ボタンに出す番号。現在ページを中央寄せした最大 5 個 */
  visiblePageNumbers: number[];
  /** 指定ページへ移動する。1〜`totalPages` の範囲で呼ぶ */
  onPageChange: (page: number) => void;
  /** カードを選択して詳細画面へ移動する */
  onVideoClick: (video: VideoItem) => void;
  /**
   * 削除の確認モーダルを開く（この時点では削除しない。実行は `onModalConfirm`）。
   * `e` はカード全体のクリック（詳細遷移）へ伝播させないために受け取る
   */
  onVideoDelete: (id: string, title: string, e?: React.MouseEvent) => void;

  // --- 詳細（VideoDetail） ---

  /** 編集画面へ移動する。キャンセル時はこの詳細画面へ戻る */
  onVideoEdit: (video: VideoItem) => void;

  // --- 追加/編集フォーム（VideoForm） ---

  /** フォームの入力値。追加時は空、編集時は対象動画で初期化される */
  formData: Partial<VideoItem>;
  /** 項目ごとの検証エラー。キーが無い項目はエラーなし */
  formErrors: ValidationErrors;
  /** フォームの入力を反映する */
  onFormChange: (data: Partial<VideoItem>) => void;
  /** 指定項目のエラー表示を消す（再入力時に呼ぶ） */
  onErrorClear: (field: keyof ValidationErrors) => void;
  /** 保存する。検証 NG なら `formErrors` を更新して送信しない */
  onFormSave: () => void;
  /** 入力を破棄する。追加時は一覧へ、編集時は元の詳細へ戻る */
  onFormCancel: () => void;

  // --- 追加 FAB ---

  /** 追加フォームを開く。管理者のみ導線が出る */
  onAddClick: () => void;

  // --- 確認モーダル ---

  /** 確認モーダルを表示中か */
  modalOpen: boolean;
  /** モーダルの見出し */
  modalTitle: string;
  /** モーダルの本文。削除対象のタイトル等を含む */
  modalMessage: string;
  /** モーダルの見た目。`danger` は削除など取り消せない操作に使う */
  modalVariant: "danger" | "info";
  /** 確定時の処理。非同期の場合は完了まで待ってから閉じる */
  onModalConfirm: () => void | Promise<void>;
  /** 確定せずに閉じる */
  onModalClose: () => void;

  // --- トースト ---

  /** 表示中のトースト文言。無いときは `null` */
  toastMessage: string | null;
};
