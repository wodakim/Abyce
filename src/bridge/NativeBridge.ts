// Native Bridge for WebView Communication (Ads, Native Features)

interface NativeInterface {
  showInterstitial: () => void;
  showRewarded: () => void;
}

declare global {
  interface Window {
    Android?: NativeInterface;
    webkit?: { messageHandlers: { native: { postMessage: (msg: any) => void } } };
    onAdClosed?: () => void;
    onAdReward?: () => void;
  }
}

export class NativeBridge {
  private isAndroid: boolean;
  private isIOS: boolean;
  private onPause: () => void;
  private onResume: () => void;

  constructor(onPause: () => void, onResume: () => void) {
    this.isAndroid = typeof window.Android !== 'undefined';
    this.isIOS = typeof window.webkit !== 'undefined';
    this.onPause = onPause;
    this.onResume = onResume;

    // Expose global callbacks for Native to call
    window.onAdClosed = () => {
      console.log('NativeBridge: Ad Closed');
      this.onResume();
    };

    window.onAdReward = () => {
      console.log('NativeBridge: Ad Rewarded');
      // Dispatch event for Game Logic to pick up
      window.dispatchEvent(new CustomEvent('abyce-reward-granted'));
      this.onResume();
    };

    // Listen for UI requests
    window.addEventListener('abyce-ad-req', (e: any) => {
      if (e.detail === 'rewarded') {
        this.showRewarded();
      } else {
        this.showInterstitial();
      }
    });
  }

  showInterstitial(): void {
    console.log('NativeBridge: Requesting Interstitial');
    this.onPause();

    if (this.isAndroid && window.Android) {
      window.Android.showInterstitial();
    } else if (this.isIOS && window.webkit) {
      window.webkit.messageHandlers.native.postMessage({ action: 'showInterstitial' });
    } else {
      // Mock for Browser
      console.log('NativeBridge: [MOCK] Showing Interstitial Ad...');
      setTimeout(() => {
        console.log('NativeBridge: [MOCK] Ad Closed');
        window.onAdClosed?.();
      }, 2000);
    }
  }

  showRewarded(): void {
    console.log('NativeBridge: Requesting Rewarded Video');
    this.onPause();

    if (this.isAndroid && window.Android) {
      window.Android.showRewarded();
    } else if (this.isIOS && window.webkit) {
      window.webkit.messageHandlers.native.postMessage({ action: 'showRewarded' });
    } else {
      // Mock for Browser
      console.log('NativeBridge: [MOCK] Showing Rewarded Ad...');
      setTimeout(() => {
        console.log('NativeBridge: [MOCK] Ad Completed');
        window.onAdReward?.();
      }, 3000);
    }
  }
}
