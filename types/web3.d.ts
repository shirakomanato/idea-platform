interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    selectedAddress: string | null;
    isMetaMask?: boolean;
    on?: (eventName: string, callback: (...args: unknown[]) => void) => void;
    removeListener?: (eventName: string, callback: (...args: unknown[]) => void) => void;
  };
}