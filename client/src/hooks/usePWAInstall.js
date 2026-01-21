import { useCallback, useEffect, useState } from "react";

let deferredPromptGlobal = null;
let isInstallableGlobal = false;
let isInitialized = false;
const subscribers = new Set();

const notify = () => {
  const snapshot = {
    deferredPrompt: deferredPromptGlobal,
    isInstallable: isInstallableGlobal,
  };
  subscribers.forEach((fn) => fn(snapshot));
};

export const initPWAInstall = () => {
  if (isInitialized) return;
  if (typeof window === "undefined") return;
  isInitialized = true;

  const onBeforeInstallPrompt = (event) => {
    // Chrome (Android/Desktop) fires this when the PWA meets install criteria.
    // Prevent the mini-infobar and store the event so we can trigger it later.
    event.preventDefault();
    deferredPromptGlobal = event;
    isInstallableGlobal = true;
    notify();
  };

  const onAppInstalled = () => {
    deferredPromptGlobal = null;
    isInstallableGlobal = false;
    notify();
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
};

const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(isInstallableGlobal);
  const [deferredPrompt, setDeferredPrompt] = useState(deferredPromptGlobal);

  useEffect(() => {
    initPWAInstall();

    const onUpdate = (snapshot) => {
      setDeferredPrompt(snapshot.deferredPrompt);
      setIsInstallable(snapshot.isInstallable);
    };

    subscribers.add(onUpdate);
    // Sync once on mount in case something changed before subscription.
    onUpdate({ deferredPrompt: deferredPromptGlobal, isInstallable: isInstallableGlobal });

    return () => {
      subscribers.delete(onUpdate);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPromptGlobal) return { outcome: "unavailable" };

    deferredPromptGlobal.prompt();

    try {
      const choiceResult = await deferredPromptGlobal.userChoice;
      // This event can only be used once.
      deferredPromptGlobal = null;
      isInstallableGlobal = false;
      notify();
      return { outcome: choiceResult?.outcome || "unknown" };
    } catch {
      deferredPromptGlobal = null;
      isInstallableGlobal = false;
      notify();
      return { outcome: "unknown" };
    }
  }, []);

  return { isInstallable, installApp };
};

export default usePWAInstall;
