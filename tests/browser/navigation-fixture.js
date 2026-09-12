import { useSyncExternalStore } from "react";
const subscribe = (callback) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
const pushState = window.history.pushState.bind(window.history);
window.history.pushState = (...args) => {
  pushState(...args);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
export function usePathname() {
  return useSyncExternalStore(subscribe, () => location.pathname);
}
export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => location.search);
  return new URLSearchParams(search);
}
export function useRouter() {
  return { push: (url) => window.history.pushState(null, "", url) };
}
