// The engine targets plain ES2023 so it stays runtime-agnostic, but every runtime it runs
// in (browsers, Cloudflare Workers, Node) provides structuredClone.
declare function structuredClone<T>(value: T): T;
