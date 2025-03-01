export interface ChromeMessage {
  type: 'CHECK_CONNECTION' | 'SEND_MESSAGE';
  text?: string;
}

export interface ChromeResponse {
  timestamp?: string;
  status?: 'success' | 'error';
  error?: string;
  aiResponse?: string;
}

export type MessageHandler = (response: ChromeResponse) => void;
