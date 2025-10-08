import React from "react";

export function useReloadable<T>(loader: () => Promise<T>, deps: any[] = []) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const reload = async () => { try { setLoading(true); setError(null); const d = await loader(); setData(d); } catch (e: any) { setError(e?.message ?? String(e)); } finally { setLoading(false); } };
  React.useEffect(() => { reload(); /* eslint-disable-next-line */ }, deps);
  return { loading, data, error, reload };
}

