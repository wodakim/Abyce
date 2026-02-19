// src/core/io/Serializer.ts

export class Serializer {
  // Convert Float32Array to Base64 String
  static encode(data: Float32Array): string {
    // Treat the buffer as bytes
    const uint8 = new Uint8Array(data.buffer);
    let binary = '';
    const len = uint8.byteLength;
    // Chunking to avoid stack overflow with spread/apply on large arrays
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }

  // Convert Base64 String to Float32Array
  static decode(base64: string): Float32Array | null {
    try {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Float32Array(bytes.buffer);
    } catch (e) {
        console.error("Failed to decode save data:", e);
        return null;
    }
  }

  static saveToStorage(key: string, data: object): void {
      try {
          localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
          console.warn("Storage save failed:", e);
      }
  }

  static loadFromStorage(key: string): any {
      try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
      } catch (e) {
          console.warn("Storage load failed:", e);
          return null;
      }
  }
}
