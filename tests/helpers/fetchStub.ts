type FetchHandler = (url: URL) => Response | Promise<Response>;

export type FetchStub = {
  calls: () => URL[];
  callCount: () => number;
  lastUrl: () => URL;
  param: (key: string) => string | null;
  restore: () => void;
};

export function stubFetch(handler: FetchHandler): FetchStub {
  const original = globalThis.fetch;
  const seen: URL[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    const url = new URL(raw);
    seen.push(url);
    void init;
    return await handler(url);
  }) as typeof fetch;

  const lastUrl = (): URL => {
    const url = seen[seen.length - 1];
    if (url === undefined) {
      throw new Error("fetch no fue invocado");
    }
    return url;
  };

  return {
    calls: () => seen.slice(),
    callCount: () => seen.length,
    lastUrl,
    param: (key) => lastUrl().searchParams.get(key),
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
