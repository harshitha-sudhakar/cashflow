import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { UserSettings } from "./types";

const DEFAULT_SETTINGS: UserSettings = {
  forecastHorizonDays: 30,
  comfortBuffer: 0,
};

export function useUserSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, "userSettings", userId)).then((snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as UserSettings);
      }
      setLoading(false);
    });
  }, [userId]);

  async function updateSettings(partial: Partial<UserSettings>) {
    if (!userId) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    await setDoc(doc(db, "userSettings", userId), next, { merge: true });
  }

  return { settings, loading, updateSettings };
}
