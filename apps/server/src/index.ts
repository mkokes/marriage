import { routePartykitRequest, Server } from 'partyserver';

export interface Env {
  Table: DurableObjectNamespace<Table>;
}

/**
 * One Durable Object per game table (the room name is the table code). It will
 * hold the authoritative game state; for now it only tracks who is connected.
 * Client messages are ignored (the default `onMessage`) until validated game intents
 * exist — raw client input must never be rebroadcast, or peers could forge server messages.
 */
export class Table extends Server<Env> {
  override onConnect(): void {
    this.broadcastPresence();
  }

  override onClose(): void {
    this.broadcastPresence();
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
