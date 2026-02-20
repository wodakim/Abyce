export class NetworkMonitor {
  private isOnline: boolean = true;
  private checkInterval: number = 5000; // 5 seconds
  private overlay: HTMLElement | null;
  private onStatusChange: (online: boolean) => void;

  constructor(onStatusChange: (online: boolean) => void) {
    this.onStatusChange = onStatusChange;
    this.overlay = document.getElementById('offline-overlay');

    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initial check
    this.checkConnection();

    // Periodic check
    setInterval(() => this.checkConnection(), this.checkInterval);
  }

  private handleOnline(): void {
    // navigator.onLine said yes, but verify with ping
    this.checkConnection();
  }

  private handleOffline(): void {
    this.setOnlineStatus(false);
  }

  private async checkConnection(): Promise<void> {
    if (!navigator.onLine) {
      this.setOnlineStatus(false);
      return;
    }

    try {
      // Basic fetch to check if we can reach the internet
      // Use 'no-cache' to avoid false positives from cache
      // Fetching root '/' is safer than specific assets that might be missing
      const response = await fetch('/?t=' + Date.now(), { method: 'HEAD', cache: 'no-cache' });
      if (response.ok) {
        this.setOnlineStatus(true);
      } else {
        this.setOnlineStatus(false);
      }
    } catch (e) {
      this.setOnlineStatus(false);
    }
  }

  private setOnlineStatus(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.onStatusChange(online);

      if (this.overlay) {
        this.overlay.style.display = online ? 'none' : 'flex';
      }
    }
  }
}
