import { useState, useEffect } from 'react';
import { chromeMessageService } from '../services/chromeMessageService';

export function useMessageHandler() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking connection...');
  const [message, setMessage] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    chromeMessageService.checkConnection(response => {
      if (chrome.runtime.lastError) {
        setConnectionStatus('Error: Not connected to background script');
      } else {
        setConnectionStatus(`Connected to background script (${response.timestamp})`);
      }
    });
  }, []);

  const clearResponse = () => {
    setResponse('');
  };

  const sendMessage = (messageToSend?: string) => {
    const messageText = messageToSend || message;
    console.log('sendMessage called with message:', messageText);

    return new Promise((resolve, reject) => {
      if (!messageText.trim()) {
        console.log('Message is empty, returning early');
        reject(new Error('Message is empty'));
        return;
      }

      console.log('Setting loading state and clearing response');
      setIsLoading(true);
      setResponse('');

      console.log('Sending message to chrome service:', messageText);
      chromeMessageService.sendAIMessage(messageText, response => {
        console.log('Received response from chrome service:', response);
        setIsLoading(false);

        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          setResponse('Error sending message');
          reject(chrome.runtime.lastError);
        } else if (response.status === 'error') {
          console.error('Service error:', response.error);
          setResponse(`Error: ${response.error}`);
          reject(new Error(response.error));
        } else {
          console.log('Success! Setting AI response');
          setResponse(`AI Response: "${response.aiResponse}"`);
          resolve(response);
        }
      });
    });
  };

  return {
    connectionStatus,
    message,
    setMessage,
    response,
    isLoading,
    sendMessage,
    clearResponse,
  };
}
