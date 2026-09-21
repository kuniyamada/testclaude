/**
 * 暗闇の屋敷 - ネット協力プレイ用の中継サーバー（Cloudflare Worker + Durable Object）
 *
 * 部屋コードごとに 1 つの Durable Object が立ち、参加者の WebSocket を束ねて
 * メッセージを中継する。ゲームの進行はホスト（最初に入った人、slot 0）のブラウザが行い、
 * ここではルールを一切持たない。
 *
 *   接続: GET /ws/:code  (WebSocket Upgrade)
 *   サーバー → 参加者:
 *     { t: 'welcome', slot, members: number[] }   接続直後。自分の slot と現在の参加者
 *     { t: 'members', members: number[] }         参加者の増減
 *     { t: 'host_left' }                          ホストが切断。部屋は解散
 *     { t: 'err', m: 'full' | 'started' }         満員 / すでに開始済み
 *   参加者 → サーバー:
 *     { t: 'lock' }   ホストのみ。以後の入室を拒否（ゲーム開始）
 *     その他        送信者以外の全員へそのまま中継（from: slot を付与）
 *
 * デプロイ:  npx wrangler deploy -c worker/wrangler.jsonc
 */

export interface Env {
  ROOMS: DurableObjectNamespace;
}

const MAX_PLAYERS = 4;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/ws\/([A-Za-z0-9]{3,8})\/?$/);
    if (m) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      const id = env.ROOMS.idFromName(m[1].toUpperCase());
      return env.ROOMS.get(id).fetch(request);
    }
    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({ ok: true, service: 'dark-manor-relay' }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response('Not found', { status: 404 });
  },
};

interface Session {
  ws: WebSocket;
  slot: number;
}

export class RoomDO implements DurableObject {
  private sessions: Session[] = [];
  private locked = false;

  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();

    if (this.locked) {
      this.send(server, { t: 'err', m: 'started' });
      server.close(4001, 'started');
      return new Response(null, { status: 101, webSocket: client });
    }
    const slot = this.freeSlot();
    if (slot < 0) {
      this.send(server, { t: 'err', m: 'full' });
      server.close(4002, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }

    const session: Session = { ws: server, slot };
    this.sessions.push(session);
    this.send(server, { t: 'welcome', slot, members: this.members() });
    this.broadcast({ t: 'members', members: this.members() }, session);

    server.addEventListener('message', (ev) => this.onMessage(session, ev.data));
    const close = () => this.onClose(session);
    server.addEventListener('close', close);
    server.addEventListener('error', close);

    return new Response(null, { status: 101, webSocket: client });
  }

  private onMessage(from: Session, data: string | ArrayBuffer) {
    if (typeof data !== 'string' || data.length > 16384) return;
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (msg.t === 'lock') {
      if (from.slot === 0) { this.locked = true; this.broadcast({ t: 'locked' }, null); }
      return;
    }
    if (msg.t === 'ping') { this.send(from.ws, { t: 'pong', ts: msg.ts }); return; }
    msg.from = from.slot;
    this.broadcast(msg, from);
  }

  private onClose(session: Session) {
    const idx = this.sessions.indexOf(session);
    if (idx < 0) return;
    this.sessions.splice(idx, 1);
    if (session.slot === 0) {
      // ホストが去ったら部屋は解散。次に来た人が新しい部屋として使えるように初期化する
      this.broadcast({ t: 'host_left' }, null);
      for (const s of this.sessions) { try { s.ws.close(4000, 'host left'); } catch {} }
      this.sessions = [];
      this.locked = false;
      return;
    }
    this.broadcast({ t: 'members', members: this.members() }, null);
    if (this.sessions.length === 0) this.locked = false;
  }

  private freeSlot(): number {
    for (let i = 0; i < MAX_PLAYERS; i++) if (!this.sessions.some((s) => s.slot === i)) return i;
    return -1;
  }
  private members(): number[] {
    return this.sessions.map((s) => s.slot).sort((a, b) => a - b);
  }
  private send(ws: WebSocket, msg: unknown) {
    try { ws.send(JSON.stringify(msg)); } catch {}
  }
  private broadcast(msg: unknown, except: Session | null) {
    const data = JSON.stringify(msg);
    for (const s of this.sessions) {
      if (s === except) continue;
      try { s.ws.send(data); } catch {}
    }
  }
}
