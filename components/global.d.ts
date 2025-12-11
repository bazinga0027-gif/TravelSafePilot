/// <reference types="@types/google.maps" />

// Let TS know we're using the web components & marker lib at runtime.
declare global {
  interface Window {
    google: typeof google | undefined;
  }
}

// Make this a module
export {};
