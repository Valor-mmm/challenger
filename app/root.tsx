import React, { useContext, useEffect } from "react";
import { useLoaderData, useLocation, useMatches } from "@remix-run/react";
import type { LinksFunction, LoaderArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import tailwindStylesheetUrl from "./styles/tailwind.css";
import { getUser } from "./session.server";
import FavIcons from "~/favIcons";
import { withEmotionCache } from "@emotion/react";
import { ClientStyleContext, ServerStyleContext } from "~/context";
import { ChakraProvider } from "@chakra-ui/react";
import customTheme from "~/theme";

import i18next from "~/i18next.server";
import { useTranslation } from "react-i18next";
import { useChangeLanguage } from "remix-i18next";

let isMount = true;
export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: tailwindStylesheetUrl }];
};
export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Remix Notes",
  viewport: "width=device-width,initial-scale=1",
});
export async function loader({ request }: LoaderArgs) {
  let locale = await i18next.getLocale(request);
  return json({ user: await getUser(request), locale });
}

export let handle = {
  // In the handle export, we can add a i18n key with namespaces our route
  // will need to load. This key can be a single string or an array of strings.
  // TIP: In most cases, you should set this to your defaultNS from your i18n config
  // or if you did not set one, set it to the i18next default namespace "translation"
  i18n: "common",
};

interface DocumentProps {
  children: React.ReactNode;
}

const Document = withEmotionCache(
  ({ children }: DocumentProps, emotionCache) => {
    const serverStyleData = useContext(ServerStyleContext);
    const clientStyleData = useContext(ClientStyleContext);

    // Get the locale from the loader
    let { locale } = useLoaderData<typeof loader>();

    let { i18n } = useTranslation();


    // This will change the i18n instance language to the current locale
    // detected by the loader, this way, when we do something to change the
    // language, this locale will change and i18next will load the correct
    // translation files
    useEffect(() => {
      i18n.changeLanguage(locale)
    }, [i18n, locale])

    // Only executed on client
    useEffect(() => {
      // re-link sheet container
      emotionCache.sheet.container = document.head;
      // re-inject tags
      const tags = emotionCache.sheet.tags;
      emotionCache.sheet.flush();
      tags.forEach((tag) => {
        (emotionCache.sheet as any)._insertTag(tag);
      });
      // reset cache to reapply global styles
      clientStyleData?.reset();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <html lang={locale} dir={i18n.dir()} style={{ height: "100vh" }}>
        <head>
          <link rel="manifest" href="/resources/manifest.webmanifest" />
          <Meta /> <Links /> <FavIcons />
          {serverStyleData?.map(({ key, ids, css }) => (
            <style
              key={key}
              data-emotion={`${key} ${ids.join(" ")}`}
              dangerouslySetInnerHTML={{ __html: css }}
            />
          ))}
        </head>
        <body style={{ height: "100vh" }}>
          {children} <ScrollRestoration /> <Scripts /> <LiveReload />
        </body>
      </html>
    );
  }
);

export default function App() {
  let location = useLocation();
  let matches = useMatches();

  React.useEffect(() => {
    let mounted = isMount;
    isMount = false;
    if ("serviceWorker" in navigator) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller?.postMessage({
          type: "REMIX_NAVIGATION",
          isMount: mounted,
          location,
          matches,
          manifest: window.__remixManifest,
        });
      } else {
        let listener = async () => {
          await navigator.serviceWorker.ready;
          navigator.serviceWorker.controller?.postMessage({
            type: "REMIX_NAVIGATION",
            isMount: mounted,
            location,
            matches,
            manifest: window.__remixManifest,
          });
        };
        navigator.serviceWorker.addEventListener("controllerchange", listener);
        return () => {
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            listener
          );
        };
      }
    }
  }, [location, matches]);

  return (
    <Document>
      <ChakraProvider theme={customTheme}>
        <Outlet />
      </ChakraProvider>
    </Document>
  );
}
