```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## 暗闇の屋敷（協力ホラーアクション）

ピコパーク風の 2〜4 人協力ゲーム。同じキーボード（またはゲームパッド）で操作し、鍵を見つけて全員で扉から脱出します。
開発サーバー起動後 `/horror` を開くとプレイできます（実体は `public/static/horror/`、依存ライブラリなし）。

- 仲間の頭に乗って高い場所へ。スイッチを踏んでいる間だけ格子が開く
- 懐中電灯を向けている間だけ「亡霊」は止まる。背後は無防備
- 誰か一人でも欠けたら全員でその夜をやり直し。全 6 ステージ
- スマホ・タブレット対応: 画面左右に各プレイヤーのボタン（◀ ▶ ▲）が出る。横向き推奨、全画面ボタンあり
