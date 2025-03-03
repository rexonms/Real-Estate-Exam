import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';
import OpenAI from 'openai';

// OpenAI API configuration
const OPENAI_API_KEY = process.env.CEB_OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for browser environment
});

// Function to process message with OpenAI
async function processWithOpenAI(message: string) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not found in environment variables (CEB_OPENAI_API_KEY)');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message },
      ],
      max_tokens: 150,
    });

    return completion.choices[0].message.content;
  } catch (error: any) {
    // Handle specific OpenAI errors
    if (error?.status === 429) {
      throw new Error(
        'OpenAI API rate limit exceeded. Please try again later or check your billing status at platform.openai.com/account/billing',
      );
    } else if (error?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
    } else if (error?.status === 500) {
      throw new Error('OpenAI service is currently experiencing issues. Please try again later.');
    }

    // Log the full error for debugging but send a user-friendly message
    console.error('Full OpenAI error:', error);
    throw new Error('Unable to get response from AI. Please try again later.');
  }
}

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');

// Add message listener for connection validation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_CONNECTION') {
    sendResponse({ status: 'connected', timestamp: new Date().toISOString() });
  }

  if (message.type === 'SEND_MESSAGE') {
    console.log('Background received message:', message.text);

    // Process message with OpenAI
    processWithOpenAI(message.text)
      .then(aiResponse => {
        sendResponse({
          status: 'received',
          originalText: message.text,
          aiResponse,
          timestamp: new Date().toISOString(),
        });
      })
      .catch(error => {
        sendResponse({
          status: 'error',
          originalText: message.text,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      });

    // Return true to indicate we will send response asynchronously
    return true;
  }

  return true;
});

console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
