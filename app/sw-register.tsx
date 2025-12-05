"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Warten, bis die Seite geladen ist
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.error("SW registration failed:", err));
      });
    }
  }, []);

  return null;
}
