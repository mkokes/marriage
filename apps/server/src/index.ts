import { routePartykitRequest, Server, type Connection } from 'partyserver';

export interface Env {
  Table: DurableObjectNamespace<Table>;
}

/**
 * One Durable Object per game table (the room name is the table code). It will
 * hold the authoritative game state; for now it only tracks who is connected.
 */
export class Table extends Server<Env> {
  override onConnect(): void {
    this.broadcastPresence();
  }

  override onClose(): void {
    this.broadcastPresence();
  }

  override onMessage(connection: Connection, message: string | ArrayBuffer): void {
    this.broadcast(message, [connection.id]);
  }

  private broadcastPresence(): void {
    const count = [...this.getConnections()].length;
    this.broadcast(JSON.stringify({ type: 'presence', count }));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (await routePartykitRequest(request, env)) || new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
