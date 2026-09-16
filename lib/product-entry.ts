export const productLinks = {
  home: '/?view=home',
  app: '/?view=app',
  demo: '/?view=demo',
  pricing: '/pricing/',
} as const;

/** Explicit entry links override returning-session behavior, without changing saved networks. */
export function productEntry(search: string): 'home' | 'app' | 'demo' | null {
  const view = new URLSearchParams(search).get('view');
  return view === 'home' || view === 'app' || view === 'demo' ? view : null;
}
