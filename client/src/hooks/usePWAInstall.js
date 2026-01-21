import { useCallback, useEffect, useState } from "react";

const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      // Chrome Android fires this when the PWA meets install criteria.
      // Prevent the mini-infobar and store the event so we can trigger it later.
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return { outcome: "unavailable" };

    deferredPrompt.prompt();

    try {
      const choiceResult = await deferredPrompt.userChoice;
      // This event can only be used once.
      setDeferredPrompt(null);
      setIsInstallable(false);
      return { outcome: choiceResult?.outcome || "unknown" };
    } catch {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return { outcome: "unknown" };
    }
  }, [deferredPrompt]);

  return { isInstallable, installApp };
};

export default usePWAInstall;
