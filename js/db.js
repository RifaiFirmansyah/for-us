// js/db.js - Hybrid Storage Manager (Supabase Cloud + IndexedDB Offline Fallback)
const LOCAL_DB_NAME = 'MemoryVaultDB';
const LOCAL_DB_VERSION = 2;

// Default Supabase Cloud Connection (Auto-connect on all devices & domains)
const DEFAULT_SUPABASE_URL = 'https://taabfvcennoerwlxzduq.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_ALTQ9Mt2tyk6K69g7ASInA_C9MI1lHN';

class UnifiedMemoryDB {
  constructor() {
    this.indexedDB = null;
    this.supabase = null;
    this.isCloudEnabled = false;
    this.supabaseUrl = localStorage.getItem('mv_supabase_url') || DEFAULT_SUPABASE_URL;
    this.supabaseKey = localStorage.getItem('mv_supabase_key') || DEFAULT_SUPABASE_KEY;
  }

  async init() {
    // 1. Init Local IndexedDB
    await this.initIndexedDB();

    // 2. Init Supabase if credentials exist
    if (this.supabaseUrl && this.supabaseKey && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.isCloudEnabled = true;
        console.log('✅ Supabase Cloud Connected Successfully!');
      } catch (err) {
        console.warn('Supabase initialization failed, falling back to local DB:', err);
        this.isCloudEnabled = false;
      }
    }

    return this;
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
          memoryStore.createIndex('date', 'date', { unique: false });
          memoryStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.indexedDB = event.target.result;
        resolve(this.indexedDB);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        resolve(null);
      };
    });
  }

  setCloudConfig(url, key) {
    this.supabaseUrl = (url || '').trim();
    this.supabaseKey = (key || '').trim();
    localStorage.setItem('mv_supabase_url', this.supabaseUrl);
    localStorage.setItem('mv_supabase_key', this.supabaseKey);

    if (this.supabaseUrl && this.supabaseKey && window.supabase) {
      try {
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.isCloudEnabled = true;
        return true;
      } catch (e) {
        this.isCloudEnabled = false;
        return false;
      }
    } else {
      this.supabase = null;
      this.isCloudEnabled = false;
      return false;
    }
  }

  // Upload file to Supabase Storage Bucket 'memories'
  async uploadFileToStorage(file) {
    if (!this.isCloudEnabled || !this.supabase) {
      return null;
    }

    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `uploads/${Date.now()}_${cleanName}`;

      const { data, error } = await this.supabase.storage
        .from('memories')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Supabase Storage upload error:', error);
        throw error;
      }

      const { data: publicUrlData } = this.supabase.storage
        .from('memories')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload file to cloud storage:', err);
      return null;
    }
  }

  // Add memory to Supabase or IndexedDB
  async addMemory(memory) {
    let cloudResult = null;

    if (this.isCloudEnabled && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('memories')
          .insert([{
            title: memory.title,
            date: memory.date,
            category: memory.category || 'favorite',
            note: memory.note || '',
            type: memory.type || 'photo',
            media_url: memory.mediaUrl
          }])
          .select();

        if (!error && data && data.length > 0) {
          cloudResult = data[0];
          return cloudResult.id;
        }
      } catch (err) {
        console.warn('Supabase insert failed, saving to local DB:', err);
      }
    }

    // Fallback to IndexedDB
    return new Promise((resolve, reject) => {
      if (!this.indexedDB) {
        resolve(Date.now());
        return;
      }
      const tx = this.indexedDB.transaction(['memories'], 'readwrite');
      const store = tx.objectStore('memories');
      const request = store.add({
        ...memory,
        createdAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all memories
  async getAllMemories() {
    if (this.isCloudEnabled && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('memories')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data) {
          return data.map(item => ({
            id: item.id,
            title: item.title,
            date: item.date,
            category: item.category,
            note: item.note,
            type: item.type,
            mediaUrl: item.media_url,
            createdAt: item.created_at
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local:', err);
      }
    }

    // Fallback to IndexedDB
    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve([]);
        return;
      }
      const tx = this.indexedDB.transaction(['memories'], 'readonly');
      const store = tx.objectStore('memories');
      const request = store.getAll();
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(sorted);
      };
      request.onerror = () => resolve([]);
    });
  }

  // Delete memory
  async deleteMemory(id) {
    if (this.isCloudEnabled && this.supabase) {
      try {
        await this.supabase.from('memories').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete failed:', err);
      }
    }

    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve(true);
        return;
      }
      try {
        const tx = this.indexedDB.transaction(['memories'], 'readwrite');
        const store = tx.objectStore('memories');
        store.delete(id);
        if (!isNaN(Number(id))) store.delete(Number(id));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(true);
      } catch (e) {
        resolve(true);
      }
    });
  }

  // Settings
  async getSetting(key, defaultValue = null) {
    if (this.isCloudEnabled && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('settings')
          .select('value')
          .eq('key', key)
          .single();

        if (!error && data && data.value !== undefined) {
          return data.value;
        }
      } catch (err) {
        // quiet fallback
      }
    }

    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve(defaultValue);
        return;
      }
      const tx = this.indexedDB.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : defaultValue);
      };
      request.onerror = () => resolve(defaultValue);
    });
  }

  async setSetting(key, value) {
    if (this.isCloudEnabled && this.supabase) {
      try {
        await this.supabase
          .from('settings')
          .upsert({ key, value });
      } catch (err) {
        console.warn('Supabase setSetting error:', err);
      }
    }

    return new Promise((resolve) => {
      if (!this.indexedDB) {
        resolve(true);
        return;
      }
      const tx = this.indexedDB.transaction(['settings'], 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(true);
    });
  }
}

window.memoryDB = new UnifiedMemoryDB();
