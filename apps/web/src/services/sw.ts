/// <reference lib='webworker' />

import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { precacheAndRoute } from 'workbox-precaching';
import { replayPendingPredictions } from './replay';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };
precacheAndRoute(self.__WB_MANIFEST);

const QUEUE_NAME = 'mood-prediction-queue-v1';

const bgSyncPlugin = new BackgroundSyncPlugin(QUEUE_NAME, {
    maxRetentionTime: 24 * 60,
    onSync: () => replayPendingPredictions(),
});

registerRoute(
    ({ url }) => url.pathname === '/api/predict',
    new NetworkOnly({ plugins: [bgSyncPlugin] }),
    'POST'
);

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    self.clients.claim();
});

self.addEventListener('message', event => {
    if (event.data?.type === 'REPLAY_QUEUE') {
        event.waitUntil(replayPendingPredictions());
    }
});
