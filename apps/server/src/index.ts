import { isRecord } from '@marriage/engine';
import {
  isClientMessage,
  MAX_MESSAGE_BYTES,
  TOKEN_PATTERN,
  type ServerMessage,
} from '@marriage/protocol';
import {
  routePartykitRequest,
  Server,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from 'partyserver';
import {
  handleMessage,
  handleTimeout,
  newTable,
  tableView,
  type Outcome,
  type TableDeps,
  type TableState,
} from './table';

export interface Env {
  Table: DurableObjectNamespace<Table>;
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Device tokens are stored and compared only as SHA-256 hashes. */
async function hashToken(token: string): Promise<string> {
  return toHex(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))),
  );
}

const deps: TableDeps = {
  now: () => Date.now(),
  newKey: () => toHex(crypto.getRandomValues(new Uint8Array(32))),
  newId: () => crypto.randomUUID(),
};

const credentialOf = (connection: Connection): string | null => {
  const state: unknown = connection.state;
  return isRecord(state) && typeof state.credential === 'string' ? state.credential : null;
};

const send = (connection: Connection, message: ServerMessage) =>
  connection.send(JSON.stringify(message));

/**
 * One Durable Object per table (the room name is the table code). It owns the
 * authoritative state, persists it after every change, and sends each connection its
 * own redacted view. All rules live in ./table and the engine.
 */
export class Table extends Server<Env> {
  static override options = { hibernate: true };

  private table: TableState = newTable();

  override async onStart(): Promise<void> {
    this.table = (await this.ctx.storage.get<TableState>('table')) ?? newTable();
  }

  override async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    const token = new URL(ctx.request.url).searchParams.get('token');
    if (!token || !TOKEN_PATTERN.test(token)) {
      connection.close(4001, 'Missing or invalid token');
      return;
    }
    connection.setState({ credential: await hashToken(token) });
    this.broadcastTable();
  }

  override onClose(): void {
    this.broadcastTable();
  }

  override async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    const credential = credentialOf(connection);
    if (!credential) return;
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES) {
      send(connection, { type: 'error', message: 'Message rejected' });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      send(connection, { type: 'error', message: 'Message rejected' });
      return;
    }
    if (!isClientMessage(parsed)) {
      send(connection, { type: 'error', message: 'Unknown message' });
      return;
    }
    await this.commit(handleMessage(this.table, credential, parsed, deps), connection);
  }

  override async onAlarm(): Promise<void> {
    const outcome = handleTimeout(this.table, deps);
    if (outcome) await this.commit(outcome);
    else await this.scheduleAlarm();
  }

  private async commit(outcome: Outcome, connection?: Connection): Promise<void> {
    if (!outcome.ok) {
      if (connection) send(connection, { type: 'error', message: outcome.error });
      return;
    }
    this.table = outcome.table;
    await this.ctx.storage.put('table', this.table);
    if (outcome.finished) {
      await this.ctx.storage.put(`replay:${outcome.finished.handNumber}`, outcome.finished);
    }
    await this.scheduleAlarm();
    this.broadcastTable();
  }

  private async scheduleAlarm(): Promise<void> {
    if (this.table.turnDeadline === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(this.table.turnDeadline);
  }

  private broadcastTable(): void {
    const open = [...this.getConnections()].filter((c) => c.readyState === WebSocket.OPEN);
    const connected = new Set(open.map(credentialOf).filter((c) => c !== null));
    for (const connection of open) {
      const credential = credentialOf(connection);
      send(connection, { type: 'table', table: tableView(this.table, credential, connected) });
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routePartykitRequest(request, env)) || new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
