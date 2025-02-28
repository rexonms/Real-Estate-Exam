import { useEffect, useState } from 'react';
import { ToggleButton } from '@extension/ui';
import { exampleThemeStorage } from '@extension/storage';
import { t } from '@extension/i18n';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking connection...');

  useEffect(() => {
    console.log('content ui loaded');

    // Check connection with background script
    chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' }, response => {
      if (chrome.runtime.lastError) {
        setConnectionStatus('Error: Not connected to background script');
      } else {
        setConnectionStatus(`Connected to background script (${response.timestamp})`);
      }
    });
  }, []);

  return (
    <div className="flex items-center justify-between gap-2 rounded bg-blue-100 px-2 py-1">
      <div className="flex flex-col gap-1">
        <div className="text-blue-500">
          Edit <strong className="text-blue-700">pages/content-ui/src/app.tsx</strong> and save to reload.
        </div>
        <div className={connectionStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}>{connectionStatus}</div>
      </div>
      <ToggleButton onClick={exampleThemeStorage.toggle}>{t('toggleTheme')}</ToggleButton>
    </div>
  );
}
