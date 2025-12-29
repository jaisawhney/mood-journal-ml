/// <reference lib='webworker' />

import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { ExpirationPlugin } from "workbox-expiration";

const EMOTION_MODEL_CACHE = "emotion-model-v1";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };
precacheAndRoute(self.__WB_MANIFEST);

const handler = createHandlerBoundToURL('/index.html');
const navigationRouter = new NavigationRoute(handler, {
    denylist: [
        new RegExp('/api/'),
    ],
});
registerRoute(navigationRouter);


registerRoute(
    ({ url }) => url.pathname.startsWith("/api/models/"),
    new CacheFirst({
        cacheName: EMOTION_MODEL_CACHE,
        matchOptions: {
            ignoreVary: true,
            ignoreSearch: true,
        },
        plugins: [
            new ExpirationPlugin({
                maxEntries: 20,
                purgeOnQuotaError: true,
            }),
        ],
    })
);

registerRoute(
    ({ url }) =>
        url.pathname.includes("onnxruntime-web") &&
        url.pathname.endsWith(".wasm"),
    new CacheFirst({
        cacheName: "onnxruntime-wasm",
    })
);


self.addEventListener('install', (event) => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(EMOTION_MODEL_CACHE).then(cache =>
            cache.addAll([
                "/models/emotion-model/v1/onnx/model_quantized.onnx",
                "/models/emotion-model/v1/tokenizer.json",
                "/models/emotion-model/v1/tokenizer_config.json",
                "/models/emotion-model/v1/special_tokens_map.json",
                "/models/emotion-model/v1/config.json",
                "/models/emotion-model/v1/ort_config.json",
            ])
        ).catch((error) => {
            console.error("Failed to cache model files during activation:", error);
        })
    );
});


self.addEventListener('activate', () => {
    self.clients.claim();
});