import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabase';

const STORAGE_KEY = 'speakout_progress';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function parseKey(key) {
  const [language, scenarioId, sessionId, mode] = key.split(':');
  return { language, scenarioId, sessionId, mode };
}

function mergeEntry(local, remote) {
  if (!local) return remote;
  if (!remote) return local;
  return {
    completions: Math.max(local.completions, remote.completions),
    bestScore: local.bestScore != null && remote.bestScore != null
      ? Math.max(local.bestScore, remote.bestScore)
      : local.bestScore ?? remote.bestScore,
    lastScore: (local.lastAt || '') >= (remote.lastAt || '') ? local.lastScore : remote.lastScore,
    lastAt: (local.lastAt || '') >= (remote.lastAt || '') ? local.lastAt : remote.lastAt,
  };
}

async function fetchRemoteProgress(userId) {
  if (!supabase || !userId) return {};
  const { data, error } = await supabase
    .from('completions')
    .select('progress_key, completions, best_score, last_score, last_at')
    .eq('user_id', userId);
  if (error) { console.warn('Failed to fetch progress:', error.message); return {}; }
  const result = {};
  for (const row of data) {
    result[row.progress_key] = {
      completions: row.completions,
      bestScore: row.best_score,
      lastScore: row.last_score,
      lastAt: row.last_at,
    };
  }
  return result;
}

async function upsertRemoteProgress(userId, key, entry) {
  if (!supabase || !userId) return;
  const { language, scenarioId, sessionId, mode } = parseKey(key);
  const { error } = await supabase
    .from('completions')
    .upsert({
      user_id: userId,
      progress_key: key,
      language,
      scenario_id: scenarioId,
      session_id: sessionId,
      mode,
      completions: entry.completions,
      best_score: entry.bestScore,
      last_score: entry.lastScore,
      last_at: entry.lastAt,
    }, { onConflict: 'user_id,progress_key' });
  if (error) console.warn('Failed to sync progress:', error.message);
}

export function makeProgressKey(language, scenarioId, sessionId, mode) {
  return `${language}:${scenarioId}:${sessionId}:${mode}`;
}

export function useProgress(userId) {
  const [data, setData] = useState(loadProgress);
  const [synced, setSynced] = useState(false);

  // Reset sync flag on logout
  useEffect(() => {
    if (!userId) setSynced(false);
  }, [userId]);

  const hasLocalData = useMemo(() => Object.keys(data).length > 0, [data]);

  const needsSyncPrompt = !!userId && !synced && hasLocalData;

  // Sync with a chosen strategy: 'merge' | 'cloud'
  const syncProgress = useCallback(async (strategy) => {
    if (!userId || synced) return;
    setSynced(true);
    const remote = await fetchRemoteProgress(userId);
    if (strategy === 'merge') {
      setData((local) => {
        const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);
        const merged = {};
        for (const key of allKeys) {
          merged[key] = mergeEntry(local[key], remote[key]);
        }
        saveProgress(merged);
        for (const key of allKeys) {
          upsertRemoteProgress(userId, key, merged[key]);
        }
        return merged;
      });
    } else {
      // 'cloud' — replace local with remote
      saveProgress(remote);
      setData(remote);
    }
  }, [userId, synced]);

  // Auto-sync when local storage is empty (no prompt needed)
  useEffect(() => {
    if (userId && !synced && !hasLocalData) {
      syncProgress('cloud');
    }
  }, [userId, synced, hasLocalData, syncProgress]);

  const clearProgress = useCallback(() => {
    saveProgress({});
    setData({});
  }, []);

  const recordCompletion = useCallback((key, score) => {
    setData((prev) => {
      const entry = prev[key] || { completions: 0, bestScore: null, lastScore: null, lastAt: null };
      const updated = {
        ...prev,
        [key]: {
          completions: entry.completions + 1,
          bestScore: score != null
            ? (entry.bestScore != null ? Math.max(entry.bestScore, score) : score)
            : entry.bestScore,
          lastScore: score ?? entry.lastScore,
          lastAt: new Date().toISOString(),
        },
      };
      saveProgress(updated);
      // Async sync to Supabase
      if (userId) {
        upsertRemoteProgress(userId, key, updated[key]);
      }
      return updated;
    });
  }, [userId]);

  const getProgress = useCallback((key) => {
    return data[key] || null;
  }, [data]);

  const getScenarioProgress = useCallback((language, scenarioId) => {
    const prefix = `${language}:${scenarioId}:`;
    const entries = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(prefix)) {
        entries[key] = value;
      }
    }
    return entries;
  }, [data]);

  const totalCompletions = useMemo(() => {
    return Object.values(data).reduce((sum, e) => sum + e.completions, 0);
  }, [data]);

  return { data, recordCompletion, getProgress, getScenarioProgress, totalCompletions, syncProgress, clearProgress, needsSyncPrompt };
}
