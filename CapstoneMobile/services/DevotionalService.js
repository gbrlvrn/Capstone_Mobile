/**
 * DevotionalService.js
 * Fetches a daily Bible verse and caches it for the day.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const VERSE_CACHE_KEY = "@faithly_daily_verse";
const JOURNAL_PREFIX = "@faithly_journal_";

// Curated verse references for daily rotation
const VERSE_REFERENCES = [
  "John 3:16", "Psalm 23:1-6", "Philippians 4:13", "Romans 8:28",
  "Jeremiah 29:11", "Proverbs 3:5-6", "Isaiah 41:10", "Psalm 46:1",
  "Matthew 11:28-30", "Romans 12:2", "Psalm 119:105", "Galatians 5:22-23",
  "2 Timothy 1:7", "Psalm 37:4", "Hebrews 11:1", "1 Corinthians 13:4-7",
  "Ephesians 2:8-9", "James 1:2-4", "Psalm 91:1-2", "Matthew 6:33",
  "Colossians 3:23", "Psalm 121:1-2", "Romans 15:13", "Isaiah 40:31",
  "Psalm 139:14", "Philippians 4:6-7", "Joshua 1:9", "Lamentations 3:22-23",
  "1 Peter 5:7", "Psalm 34:18",
];

/**
 * Get the verse reference for today based on day-of-year rotation.
 */
function getTodayReference() {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  return VERSE_REFERENCES[dayOfYear % VERSE_REFERENCES.length];
}

/**
 * Get today's date key for caching.
 */
function getDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Fetch the daily verse. Uses cache if already fetched today.
 * Falls back to a hardcoded verse if the API fails.
 */
export async function getDailyVerse() {
  const dateKey = getDateKey();

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(VERSE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.date === dateKey) {
        return parsed;
      }
    }
  } catch {}

  // Fetch from API
  const reference = getTodayReference();
  try {
    const res = await fetch(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`,
      { timeout: 5000 }
    );
    if (res.ok) {
      const data = await res.json();
      const verse = {
        date: dateKey,
        reference: data.reference || reference,
        text: data.text?.trim() || "",
        translation: "KJV",
      };
      await AsyncStorage.setItem(VERSE_CACHE_KEY, JSON.stringify(verse));
      return verse;
    }
  } catch {}

  // Fallback
  const fallback = {
    date: dateKey,
    reference,
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    translation: "KJV",
  };
  await AsyncStorage.setItem(VERSE_CACHE_KEY, JSON.stringify(fallback)).catch(() => {});
  return fallback;
}

/**
 * Save a journal entry for a specific date.
 */
export async function saveJournalEntry(dateKey, text) {
  await AsyncStorage.setItem(`${JOURNAL_PREFIX}${dateKey}`, text);
}

/**
 * Get a journal entry for a specific date.
 */
export async function getJournalEntry(dateKey) {
  return (await AsyncStorage.getItem(`${JOURNAL_PREFIX}${dateKey}`)) || "";
}

/**
 * Get all journal entries (most recent first).
 */
export async function getAllJournalEntries() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const journalKeys = allKeys
      .filter((k) => k.startsWith(JOURNAL_PREFIX))
      .sort()
      .reverse();
    const entries = [];
    for (const key of journalKeys.slice(0, 30)) {
      const text = await AsyncStorage.getItem(key);
      if (text) {
        entries.push({
          date: key.replace(JOURNAL_PREFIX, ""),
          text,
        });
      }
    }
    return entries;
  } catch {
    return [];
  }
}
