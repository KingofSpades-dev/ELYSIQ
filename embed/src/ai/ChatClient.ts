export interface ChatResponse {
  text: string;
  emotion: string;
  voice: string;
  memory_used: boolean;
}

export class ChatClient {
  private endpoint: string;
  private history: { role: string; content: string }[] = [];
  private walletAddress: string | null = null;

  constructor(endpoint: string = '/api/chat') {
    // In production and local, this will resolve relative to the current origin
    // since the widget is served on the same domain.
    this.endpoint = endpoint;
  }

  public setWallet(address: string | null): void {
    this.walletAddress = address;
    if (!address) {
      this.history = [];
      console.log(`[ChatClient] Wallet disconnected. Cleared history.`);
      return;
    }
    const stored = localStorage.getItem('elysiq_mem_' + address);
    if (stored) {
      try {
        this.history = JSON.parse(stored);
      } catch (e) {
        this.history = [];
      }
    } else {
      this.history = [];
    }
    console.log(`[ChatClient] Wallet connected: ${address}. Loaded history: ${this.history.length} messages.`);
  }

  public getWalletAddress(): string | null {
    return this.walletAddress;
  }

  public async sendMessage(userId: string, message: string): Promise<ChatResponse> {
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, message, history: this.history }),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Save to short-term session memory
      this.history.push({ role: 'user', content: message });
      this.history.push({ role: 'assistant', content: data.text });
      
      // Persist to localStorage if wallet is connected
      if (this.walletAddress) {
        localStorage.setItem('elysiq_mem_' + this.walletAddress, JSON.stringify(this.history));
      }

      return data as ChatResponse;
    } catch (error) {
      console.error('[ChatClient] Failed to send message:', error);
      // Fallback response if backend is unreachable
      return {
        text: "I'm having trouble connecting to my brain right now.",
        emotion: "sad",
        voice: "elysiq_default",
        memory_used: false
      };
    }
  }
}
