// IndexedDB Utility for persistent code storage in CodeRival

const DB_NAME = 'CodeRivalDB'
const DB_VERSION = 1
const STORE_NAME = 'code_snippets'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

/**
 * Retrieve saved code string for a given key from IndexedDB.
 * Falls back to localStorage and performs auto-migration if legacy key exists.
 */
export async function getSavedCode(key: string): Promise<string | null> {
  if (typeof window === 'undefined') return null

  try {
    const db = await openDB()
    const result = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve((req.result as string) ?? null)
      req.onerror = () => reject(req.error)
    })

    if (result !== null) {
      return result
    }

    // Auto-migration from legacy localStorage if present
    const legacySaved = localStorage.getItem(key)
    if (legacySaved !== null) {
      await saveCode(key, legacySaved)
      try {
        localStorage.removeItem(key)
      } catch {}
      return legacySaved
    }

    return null
  } catch (err) {
    console.error('IndexedDB getSavedCode error, falling back to localStorage:', err)
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
}

/**
 * Save code string for a given key into IndexedDB.
 */
export async function saveCode(key: string, code: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(code, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.error('IndexedDB saveCode error, falling back to localStorage:', err)
    try {
      localStorage.setItem(key, code)
    } catch {}
  }
}

/**
 * Remove saved code string for a given key from IndexedDB.
 */
export async function removeSavedCode(key: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    try {
      localStorage.removeItem(key)
    } catch {}

    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.error('IndexedDB removeSavedCode error:', err)
  }
}
