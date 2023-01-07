import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

// entry.client.tsx
import React, { useState } from "react";
import { CacheProvider } from "@emotion/react";

import { ClientStyleContext } from "./context";
import createEmotionCache, { defaultCache } from "./createEmotionCache";

import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import { getInitialNamespaces } from "remix-i18next";
import i18n from "./i18n"; // your i18n configuration file

interface ClientCacheProviderProps {
  children: React.ReactNode;
}

function ClientCacheProvider({ children }: ClientCacheProviderProps) {
  const [cache, setCache] = useState(defaultCache);

  function reset() {
    setCache(createEmotionCache());
  }

  return (
    <ClientStyleContext.Provider value={{ reset }}>
      <CacheProvider value={cache}>{children}</CacheProvider>
    </ClientStyleContext.Provider>
  );
}

const i18nextSetup = i18next
  .use(initReactI18next) // Tell i18next to use the react-i18next plugin
  .use(LanguageDetector) // Setup a client-side language detector
  .use(Backend) // Setup your backend
  .init({
    ...i18n, // spread the configuration
    // This function detects the namespaces your routes rendered while SSR use
    ns: getInitialNamespaces(),
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      // Here only enable htmlTag detection, we'll detect the language only
      // server-side with remix-i18next, by using the `<html lang>` attribute
      // we can communicate to the client the language detected server-side
      order: ["htmlTag"],
      // Because we only use htmlTag, there's no reason to cache the language
      // on the browser, so we disable it
      caches: [],
    },
  });

i18nextSetup.then(() => {
  // After i18next has been initialized, we can hydrate the app
  // We need to wait to ensure translations are loaded before the hydration
  // Here wrap RemixBrowser in I18nextProvider from react-i18next
  const hydrate = () => {
    startTransition(() => {
      hydrateRoot(
        document,
        <StrictMode>
          <ClientCacheProvider>
            <RemixBrowser />
          </ClientCacheProvider>
        </StrictMode>
      );
    });
  };

  if (window.requestIdleCallback) {
    window.requestIdleCallback(hydrate);
  } else {
    // Safari doesn't support requestIdleCallback
    // https://caniuse.com/requestidlecallback
    window.setTimeout(hydrate, 1);
  }
});

if ("serviceWorker" in navigator) {
  // Use the window load event to keep the page load performant
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/entry.worker.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "SYNC_REMIX_MANIFEST",
            manifest: window.__remixManifest,
          });
        } else {
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            navigator.serviceWorker.controller?.postMessage({
              type: "SYNC_REMIX_MANIFEST",
              manifest: window.__remixManifest,
            });
          });
        }
      })
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

navigator.serviceWorker.ready
  .then((registration) => {
    const subscription = registration.pushManager.getSubscription();
    return { subscription, registration };
  })
  .then(async (sub) => {
    if (await sub.subscription) {
      return sub.subscription;
    }

    const subInfo = await fetch("/resources/subscribe");
    const returnedSubscription = await subInfo.text();

    const convertedVapidKey = urlBase64ToUint8Array(returnedSubscription);
    return sub.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  })
  .then(async (subscription) => {
    await fetch("./resources/subscribe", {
      method: "POST",
      body: JSON.stringify({
        subscription: subscription,
        type: "POST_SUBSCRIPTION",
      }),
    });
  });
