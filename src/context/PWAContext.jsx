import React, { createContext, useState, useEffect, useCallback } from 'react';
import { canInstall, onInstallAvailability, promptInstall } from '../services/installPrompt';

export const PWAContext = createContext();

/**
 * PWAProvider — `installPrompt.js` xizmati ustidagi React konteksti.
 * Ilgari bu yerda ikkinchi, alohida `beforeinstallprompt` tinglovchisi bor edi
 * va u SettingsPage/InterruptHost dagi `installPrompt.js` bilan raqobatlashib,
 * foydalanuvchi o'rnatishni rad etganda `isInstallable` ni tozalamasdi.
 * Endi yagona manba — `services/installPrompt.js`.
 */
export const PWAProvider = ({ children }) => {
  const [isInstallable, setIsInstallable] = useState(() => canInstall());

  useEffect(() => {
    setIsInstallable(canInstall());
    return onInstallAvailability((available) => {
      setIsInstallable(available);
    });
  }, []);

  const installApp = useCallback(async () => {
    await promptInstall();
  }, []);

  return (
    <PWAContext.Provider value={{ isInstallable, installApp }}>
      {children}
    </PWAContext.Provider>
  );
};
