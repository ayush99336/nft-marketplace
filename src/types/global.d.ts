interface EthereumProvider {
  request: (args: { method: string }) => Promise<string[]>;
  on: (event: string, callback: (data: string[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
