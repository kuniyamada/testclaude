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
- スマホ・タブレット対応: 左手で ◀ ▶ 移動、右手で ▲ ジャンプのボタンが出る。横向き推奨、全画面ボタンあり

### ネットで集まって遊ぶ（別々の端末から参加）

タイトルの「ネットで集まって遊ぶ」から部屋を作り、4 文字の部屋コードを仲間に伝えます。
部屋を作った人がホストとしてゲームを進行し、他の参加者は入力だけを送ります（最大 4 人）。

中継サーバーは `worker/relay.ts`（Cloudflare Worker + Durable Object）です。デプロイ手順:

```txt
npx wrangler deploy -c worker/wrangler.jsonc   # 1. 中継 Worker を先にデプロイ
npm run deploy                                  # 2. Pages 本体（wrangler.jsonc の ROOMS バインディングが中継 Worker を参照）
```

中継 Worker を使わない場合は `wrangler.jsonc` の `durable_objects` ブロックを削除してください（`/ws` は 503 を返し、ゲームは同じ端末での協力のみになります）。
別の中継先を使うときは `/horror?relay=wss://<worker のホスト名>` のようにクエリで指定できます（端末に記憶されます）。

ローカル確認: `npx wrangler dev -c worker/wrangler.jsonc --port 8790` を起動し、ゲームを `?relay=ws://127.0.0.1:8790` 付きで開きます。
