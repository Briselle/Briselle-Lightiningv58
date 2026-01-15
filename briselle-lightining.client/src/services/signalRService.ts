import * as signalR from '@microsoft/signalr';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private hubUrl: string = '/hubs/realtime'; // This would point to your .NET Core SignalR hub
  private listeners: Map<string, Function[]> = new Map();

  // Initialize the SignalR connection
  public initialize(): Promise<void> {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect()
      .build();

    this.connection.onclose((error) => {
      console.error('SignalR connection closed', error);
    });

    return this.start();
  }

  // Start the connection
  private async start(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.start();
        console.log('SignalR connected');
        
        // Re-register event listeners after reconnection
        this.registerStoredListeners();
      }
    } catch (err) {
      console.error('Error starting SignalR connection:', err);
      // Try to reconnect after a delay
      setTimeout(() => this.start(), 5000);
    }
  }

  // Register stored listeners after reconnection
  private registerStoredListeners(): void {
    this.listeners.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        this.connection?.on(eventName, handler);
      });
    });
  }

  // Subscribe to an event
  public on(eventName: string, handler: Function): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.push(handler);
    }
    
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      this.connection.on(eventName, handler);
    }
  }

  // Unsubscribe from an event
  public off(eventName: string, handler?: Function): void {
    if (!handler) {
      // Remove all handlers for this event
      this.listeners.delete(eventName);
      this.connection?.off(eventName);
    } else {
      // Remove specific handler
      const handlers = this.listeners.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
        
        if (handlers.length === 0) {
          this.listeners.delete(eventName);
        }
      }
      
      // SignalR doesn't support removing specific handlers, so we need to
      // remove all and re-add the ones we want to keep
      this.connection?.off(eventName);
      const remainingHandlers = this.listeners.get(eventName);
      if (remainingHandlers) {
        remainingHandlers.forEach(h => {
          this.connection?.on(eventName, h);
        });
      }
    }
  }

  // Invoke a method on the hub
  public invoke(methodName: string, ...args: any[]): Promise<any> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return this.connection.invoke(methodName, ...args);
    }
    return Promise.reject(new Error('SignalR connection not established'));
  }

  // Stop the connection
  public stop(): Promise<void> {
    return this.connection?.stop() || Promise.resolve();
  }
}

// Create singleton instance
const signalRService = new SignalRService();

export default signalRService;