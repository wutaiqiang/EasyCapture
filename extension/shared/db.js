/* Screenshots stay in this extension's local IndexedDB. */
globalThis.ShotDB = (() => {
  let connection;
  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('scrollshot-local', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('captures', {keyPath: 'id'});
        for (const name of ['frames', 'outputs']) {
          const store = db.createObjectStore(name, {keyPath: ['captureId', 'index']});
          store.createIndex('captureId', 'captureId');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {connection = null; reject(request.error);};
    });
    return connection;
  }
  async function transaction(name, mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('本地存储操作已中止。'));
      const request = action(tx.objectStore(name));
      if (request) request.onsuccess = () => {result = request.result;};
    });
  }
  const put = (store, record) => transaction(store, 'readwrite', s => s.put(record));
  const get = (store, key) => transaction(store, 'readonly', s => s.get(key));
  const list = store => transaction(store, 'readonly', s => s.getAll());
  const forCapture = (store, id) => transaction(store, 'readonly', s => s.index('captureId').getAll(id));
  async function clearFrames(id) { await deleteChildren('frames', id); }
  async function deleteChildren(store, id) {
    await transaction(store, 'readwrite', s => {
      const cursor = s.index('captureId').openCursor(IDBKeyRange.only(id));
      cursor.onsuccess = () => {const c = cursor.result; if (c) {c.delete(); c.continue();}};
      // Do not return the cursor: transaction() must not replace its handler.
    });
  }
  async function remove(id) {
    await deleteChildren('frames', id);
    await deleteChildren('outputs', id);
    await transaction('captures', 'readwrite', s => s.delete(id));
  }
  async function prune() {
    const records = (await list('captures')).sort((a,b) => b.createdAt-a.createdAt);
    for (let i=0; i<records.length; i++) {
      if (i>=10 || Date.now()-records[i].createdAt>24*60*60*1000) await remove(records[i].id);
    }
  }
  return {put, get, list, forCapture, remove, clearFrames, prune};
})();
