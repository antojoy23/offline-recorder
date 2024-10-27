import { openDB } from 'idb';

const VERSION = 1;

async function init() {
    if (!('indexedDB' in window)) {
        return;
    }
    const db = await openDB("antz-offline-recorder", VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains("video")) {
                db.createObjectStore('video', { keyPath: "id", autoIncrement: true });
            }
        }
    });
}