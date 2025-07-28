// src/components/SettingsPage.tsx
import React, { useState } from "react";

interface Settings {
  notifications: boolean;
  darkMode: boolean;
  readReceipts: boolean;
}

const SettingsPage = () => {
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    darkMode: false,
    readReceipts: true,
  });

  const toggleSetting = (key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">⚙️ Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Notifications</span>
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={() => toggleSetting("notifications")}
            className="accent-blue-500 w-5 h-5"
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Dark Mode</span>
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={() => toggleSetting("darkMode")}
            className="accent-blue-500 w-5 h-5"
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Read Receipts</span>
          <input
            type="checkbox"
            checked={settings.readReceipts}
            onChange={() => toggleSetting("readReceipts")}
            className="accent-blue-500 w-5 h-5"
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
