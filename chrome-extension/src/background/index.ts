import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');

// Add message listener for connection validation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_CONNECTION') {
    sendResponse({ status: 'connected', timestamp: new Date().toISOString() });
  }
  return true;
});

console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
