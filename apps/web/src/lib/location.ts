import { useSyncExternalStore } from 'react'
export function navigate(url: string, replace = false) {
  if (location.pathname + location.search === url) return
  if (replace) history.replaceState(null, '', url)
  else history.pushState(null, '', url)
  dispatchEvent(new PopStateEvent('popstate'))
}
function subscribe(callback: () => void) {
  addEventListener('popstate', callback)
  return () => removeEventListener('popstate', callback)
}
export function useLocation() {
  return useSyncExternalStore(subscribe, () => location.pathname + location.search)
}
