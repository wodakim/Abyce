// src/core/bridge/NativeBridge.ts

// Define interfaces for the injected native objects
interface AndroidInterface {
    showAd(): void;
    postMessage(message: string): void;
}

interface WebKitInterface {
    messageHandlers: {
        nativeBridge: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            postMessage(message: any): void;
        };
    };
}

declare global {
    interface Window {
        Android?: AndroidInterface;
        webkit?: WebKitInterface;
        // Callback exposed to native
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onNativeMessage?: (type: string, data: any) => void;
    }
}

export class NativeBridge {
    constructor() {
        // Setup global listener for native callbacks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.onNativeMessage = (type: string, data: any) => {
            console.log(`[NativeBridge] Received: ${type}`, data);
            // Dispatch to internal event bus if needed
        };
    }

    public showAd(): void {
        console.log("[NativeBridge] showAd called");
        try {
            if (window.Android) {
                window.Android.showAd();
            } else if (window.webkit && window.webkit.messageHandlers.nativeBridge) {
                window.webkit.messageHandlers.nativeBridge.postMessage({ action: "showAd" });
            } else {
                console.warn("[NativeBridge] Native API not found. Mocking Ad show.");
            }
        } catch (e) {
            console.error("[NativeBridge] Error calling showAd:", e);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public sendMessage(action: string, payload: any = {}): void {
        const message = JSON.stringify({ action, ...payload });
        console.log(`[NativeBridge] Sending: ${message}`);

        try {
            if (window.Android) {
                window.Android.postMessage(message);
            } else if (window.webkit && window.webkit.messageHandlers.nativeBridge) {
                window.webkit.messageHandlers.nativeBridge.postMessage(message);
            } else {
                console.log("[NativeBridge] Native API missing. Message logged.");
            }
        } catch (e) {
            console.error("[NativeBridge] Error sending message:", e);
        }
    }
}
