import type { ChromeMessage, ChromeResponse, MessageHandler } from '../types/messages';

class ChromeMessageService {
  sendMessage(message: ChromeMessage, callback: MessageHandler): void {
    chrome.runtime.sendMessage(message, (response: ChromeResponse) => {
      if (chrome.runtime.lastError) {
        callback({ status: 'error', error: 'Failed to connect to background script' });
        return;
      }
      callback(response);
    });
  }

  checkConnection(callback: MessageHandler): void {
    this.sendMessage({ type: 'CHECK_CONNECTION' }, callback);
  }

  sendAIMessage(text: string, callback: MessageHandler): void {
    this.sendMessage({ type: 'SEND_MESSAGE', text }, callback);
  }
}

export const chromeMessageService = new ChromeMessageService();
