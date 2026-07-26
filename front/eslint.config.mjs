import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import jsdoc from "eslint-plugin-jsdoc";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // JSDoc 規約（TSDoc スタイル）の機械的に判定できる部分を強制する。
  // 有効ルールの唯一の真実はこのブロック。方針の根拠は docs/10-miscellaneous-specification.md「コメント・JSDoc 方針」。
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { jsdoc },
    // TS 前提。型は JSDoc ではなくシグネチャに委ねる。
    settings: { jsdoc: { mode: "typescript" } },
    rules: {
      // 型の再掲を禁止（TS シグネチャが型の唯一の真実）。
      // 対象は @param / @returns。@throws は対象外で、そちらは型を明記する規約
      // （TS に throws 句が無く、例外の型はシグネチャに現れないため再掲に当たらない）。
      "jsdoc/no-types": "error",
      // JSDoc ブロックを持つ関数は全引数を @param で説明する。
      // 分割代入 props は型（XxxProps）が真実なので props.x 単位には展開しない。
      "jsdoc/require-param": ["error", { checkDestructured: false, checkDestructuredRoots: false }],
      "jsdoc/require-param-description": "error",
      // @param 名と実引数名を突き合わせる（名前ズレ・順序・過不足を検出）。
      "jsdoc/check-param-names": "error",
      // 返り値がある関数は @returns に意味を書く（.tsx コンポーネントは後続ブロックで除外）。
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-description": "error",
      // 書いた JSDoc の体裁を整える。
      "jsdoc/check-alignment": "warn",
      "jsdoc/no-multi-asterisks": "warn",
      // require-jsdoc は // 行コメントを誤検知するため、関数に対しては未採用。
      // ブロックの有無・質はレビューで確認する。型定義に限った強制は後続ブロックを参照。
    },
  },
  {
    // 型定義のコメント必須（.claude/rules/jsdoc.md「型定義のコメント（型本体 + メンバー）」）を機械強制する。
    //
    // 対象を src/types/** に絞る理由:
    // src/** 全体に適用すると 205 件検出され、その大半は関数シグネチャ内の
    // インラインオブジェクト型（例: `(opts: { force?: boolean })`）という誤検知だった。
    // 「書くことがない項目に埋め草コメントを付けない」方針とも衝突する。
    // 複数箇所から参照される型は types/ へ集約する規約（typescript.md「型定義の配置」）があるため、
    // types/ を強制対象にすれば「ファイルを越えて使われる型」という必須ラインを実質的にカバーできる。
    //
    // 重大度は error。static-analysis.md の「守れないルールは有効にしない（error か無効かの二択）」に従い、
    // warn を恒常状態にしない。
    files: ["src/types/**/*.ts"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          // 関数系は対象外（誤検知の原因。従来どおりレビューで担保する）。
          require: {
            FunctionDeclaration: false,
            MethodDefinition: false,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          // 型本体（type / interface）と型メンバー（プロパティ）を対象にする。
          contexts: ["TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSPropertySignature"],
        },
      ],
    },
  },
  {
    // React コンポーネント（JSX を返す .tsx）は @returns を要求しない（「@returns …の要素」はノイズ）。
    // .ts のフック / lib / API では @returns 必須のまま。
    files: ["src/**/*.tsx"],
    rules: {
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-description": "off",
    },
  },
  {
    // TypeScript コーディング規約の機械強制。根拠は .claude/rules/coding-standards.md。
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // 明示的 any を禁止。どうしても必要な箇所は eslint-disable + why コメントで明示する。
      "@typescript-eslint/no-explicit-any": "error",
      // 型定義は type に統一（union / 交差 / z.infer を表現できる上位互換）。
      // 宣言マージが必要なグローバル拡張（interface Window 等）のみ eslint-disable で例外扱い。
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // 型のみの import は import type にする（バンドラが型を確実に消せる・
      // 副作用のない循環参照を避けられる）。--fix で自動修正できる。
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
    },
  },
  // Disable ESLint formatting rules that conflict with Prettier.
  // Must be last so it overrides the rules above.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
