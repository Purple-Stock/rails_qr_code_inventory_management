// Offline Transaction Manager - Handles queuing and syncing of offline transactions
class OfflineTransactionManager {
  constructor() {
    this.dbName = 'PurpleStockOfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.syncInProgress = false;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.baseRetryDelay = 1000; // 1 second
  }

  // Initialize IndexedDB for offline storage
  async init() {
    try {
      this.db = await this.openDatabase();
      console.log('Offline Transaction Manager: Database initialized');
      
      // Register for background sync if supported
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        await this.registerBackgroundSync();
      }
      
      // Sync any pending transactions on startup
      if (navigator.onLine) {
        await this.syncPendingTransactions();
      }
      
      return true;
    } catch (error) {
      console.error('Offline Transaction Manager: Failed to initialize', error);
      return false;
    }
  }

  // Open IndexedDB database
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', {
            keyPath: 'id',
            autoIncrement: true
          });
          
          transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
          transactionStore.createIndex('type', 'type', { unique: false });
          transactionStore.createIndex('status', 'status', { unique: false });
          transactionStore.createIndex('retryCount', 'retryCount', { unique: false });
        }

        // Create conflict resolution store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', {
            keyPath: 'id',
            autoIncrement: true
          });
          
          conflictStore.createIndex('transactionId', 'transactionId', { unique: false });
          conflictStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Queue transaction for offline sync
  async queueTransaction(transactionData) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const transaction = {
      ...transactionData,
      id: this.generateTransactionId(),
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      createdOffline: !navigator.onLine
    };

    try {
      const tx = this.db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      await this.promisifyRequest(store.add(transaction));

      console.log('Offline Transaction Manager: Transaction queued', transaction.id);

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('offline-transaction-queued', {
        detail: { transaction }
      }));

      // Try immediate sync if online
      if (navigator.onLine) {
        this.syncTransaction(transaction);
      } else {
        // Register for background sync
        await this.requestBackgroundSync();
      }

      return transaction.id;
    } catch (error) {
      console.error('Offline Transaction Manager: Failed to queue transaction', error);
      throw error;
    }
  }

  // Sync individual transaction
  async syncTransaction(transaction) {
    if (this.syncInProgress) return;

    try {
      console.log('Offline Transaction Manager: Syncing transaction', transaction.id);
      
      const response = await this.sendTransactionToServer(transaction);
      
      if (response.ok) {
        await this.markTransactionSynced(transaction.id, await response.json());
        console.log('Offline Transaction Manager: Transaction synced successfully', transaction.id);
      } else {
        await this.handleSyncError(transaction, response);
      }
    } catch (error) {
      console.error('Offline Transaction Manager: Sync failed', error);
      await this.handleSyncError(transaction, error);
    }
  }

  // Send transaction to server
  async sendTransactionToServer(transaction) {
    const endpoint = this.getEndpointForTransaction(transaction);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': this.getCSRFToken()
      },
      body: JSON.stringify(transaction.data)
    };

    return fetch(endpoint, requestOptions);
  }

  // Get appropriate endpoint for transaction type
  getEndpointForTransaction(transaction) {
    const endpoints = {
      'stock_in': '/stock_transactions',
      'stock_out': '/stock_transactions',
      'stock_move': '/stock_transactions',
      'stock_adjust': '/stock_transactions',
      'item_create': '/items',
      'item_update': '/items',
      'location_create': '/locations',
      'location_update': '/locations'
    };

    return endpoints[transaction.type] || '/api/sync';
  }

  // Mark transaction as synced
  async markTransactionSynced(transactionId, serverResponse) {
    const tx = this.db.transaction(['transactions'], 'readwrite');
    const store = tx.objectStore('transactions');
    
    const transaction = await this.promisifyRequest(store.get(transactionId));
    transaction.status = 'synced';
    transaction.syncedAt = Date.now();
    transaction.serverResponse = serverResponse;
    
    await this.promisifyRequest(store.put(transaction));

    // Dispatch success event
    window.dispatchEvent(new CustomEvent('offline-transaction-synced', {
      detail: { transaction, serverResponse }
    }));
  }

  // Handle sync errors with retry logic
  async handleSyncError(transaction, error) {
    const retryCount = (this.retryAttempts.get(transaction.id) || 0) + 1;
    this.retryAttempts.set(transaction.id, retryCount);

    if (retryCount <= this.maxRetries) {
      // Exponential backoff
      const delay = this.baseRetryDelay * Math.pow(2, retryCount - 1);
      
      console.log(`Offline Transaction Manager: Retrying transaction ${transaction.id} in ${delay}ms (attempt ${retryCount})`);
      
      setTimeout(() => {
        this.syncTransaction(transaction);
      }, delay);
      
      // Update transaction status
      await this.updateTransactionStatus(transaction.id, 'retrying', retryCount);
    } else {
      console.error('Offline Transaction Manager: Max retries exceeded for transaction', transaction.id);
      await this.updateTransactionStatus(transaction.id, 'failed', retryCount);
      
      // Check for conflicts
      if (error.status === 409 || (error.response && error.response.status === 409)) {
        await this.handleConflict(transaction, error);
      }

      // Dispatch failure event
      window.dispatchEvent(new CustomEvent('offline-transaction-failed', {
        detail: { transaction, error }
      }));
    }
  }

  // Update transaction status
  async updateTransactionStatus(transactionId, status, retryCount = 0) {
    const tx = this.db.transaction(['transactions'], 'readwrite');
    const store = tx.objectStore('transactions');
    
    const transaction = await this.promisifyRequest(store.get(transactionId));
    transaction.status = status;
    transaction.retryCount = retryCount;
    transaction.lastAttempt = Date.now();
    
    await this.promisifyRequest(store.put(transaction));
  }

  // Handle data conflicts
  async handleConflict(transaction, error) {
    const conflict = {
      transactionId: transaction.id,
      timestamp: Date.now(),
      localData: transaction.data,
      serverData: error.serverData || null,
      conflictType: error.conflictType || 'unknown',
      resolved: false
    };

    const tx = this.db.transaction(['conflicts'], 'readwrite');
    const store = tx.objectStore('conflicts');
    await this.promisifyRequest(store.add(conflict));

    console.log('Offline Transaction Manager: Conflict detected', conflict);

    // Dispatch conflict event for UI handling
    window.dispatchEvent(new CustomEvent('offline-transaction-conflict', {
      detail: { conflict, transaction }
    }));
  }

  // Sync all pending transactions
  async syncPendingTransactions() {
    if (this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;

    try {
      const pendingTransactions = await this.getPendingTransactions();
      console.log(`Offline Transaction Manager: Syncing ${pendingTransactions.length} pending transactions`);

      for (const transaction of pendingTransactions) {
        await this.syncTransaction(transaction);
        // Small delay between syncs to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('Offline Transaction Manager: All pending transactions processed');
    } catch (error) {
      console.error('Offline Transaction Manager: Failed to sync pending transactions', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Get pending transactions from database
  async getPendingTransactions() {
    const tx = this.db.transaction(['transactions'], 'readonly');
    const store = tx.objectStore('transactions');
    const index = store.index('status');
    
    const pendingTransactions = [];
    const request = index.openCursor(IDBKeyRange.only('pending'));
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          pendingTransactions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(pendingTransactions);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Register for background sync
  async registerBackgroundSync() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('Offline Transaction Manager: Registered for background sync');
      return registration;
    }
  }

  // Request background sync
  async requestBackgroundSync() {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync-transactions');
      console.log('Offline Transaction Manager: Background sync requested');
    } catch (error) {
      console.error('Offline Transaction Manager: Failed to request background sync', error);
    }
  }

  // Get transaction statistics
  async getTransactionStats() {
    const tx = this.db.transaction(['transactions'], 'readonly');
    const store = tx.objectStore('transactions');
    
    const stats = {
      total: 0,
      pending: 0,
      synced: 0,
      failed: 0,
      retrying: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          stats.total++;
          stats[cursor.value.status] = (stats[cursor.value.status] || 0) + 1;
          cursor.continue();
        } else {
          resolve(stats);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  generateTransactionId() {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  getCSRFToken() {
    const token = document.querySelector('meta[name="csrf-token"]');
    return token ? token.getAttribute('content') : '';
  }
}

// Create global instance
window.offlineTransactionManager = new OfflineTransactionManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.offlineTransactionManager.init();
  });
} else {
  window.offlineTransactionManager.init();
}

export default OfflineTransactionManager;