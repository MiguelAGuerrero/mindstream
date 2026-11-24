// App-wide PWA state: the waiting update, the install prompt, online status.
// One instance for the whole app (module singleton), so the shell's notices and
// any menu's "Install app" item read the same state.
import { ref, computed } from "vue";

const installEvent = ref(null); // Chrome/Android/desktop: the deferred beforeinstallprompt
const installed = ref(false);
const online = ref(typeof navigator === "undefined" ? true : navigator.onLine);
const iosHelpOpen = ref(false);

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

// iPhone/iPad Safari has no install prompt: it needs Share → Add to Home Screen.
function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios && !isStandalone();
}

let listening = false;
function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  installed.value = isStandalone();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep it for our own "Install app" item
    installEvent.value = e;
  });
  window.addEventListener("appinstalled", () => {
    installed.value = true;
    installEvent.value = null;
  });
  window.addEventListener("online", () => { online.value = true; });
  window.addEventListener("offline", () => { online.value = false; });
}

// Ask the browser not to evict pads under storage pressure (Safari/Chrome may
// clear site data otherwise). Granted silently for installed apps on most browsers.
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function usePwa() {
  listen();
  const canInstall = computed(() => !installed.value && (!!installEvent.value || isIosBrowser()));
  async function install() {
    if (installEvent.value) {
      const e = installEvent.value;
      installEvent.value = null;
      await e.prompt();
      const { outcome } = await e.userChoice;
      if (outcome === "accepted") installed.value = true;
    } else if (isIosBrowser()) {
      iosHelpOpen.value = true;
    }
  }
  return { canInstall, install, online, iosHelpOpen };
}
