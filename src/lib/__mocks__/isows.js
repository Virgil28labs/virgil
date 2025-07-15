// Mock for isows WebSocket library
export const WebSocket = global.WebSocket || class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
  }
  
  send() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
};

export default WebSocket;