import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), "../data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

export function readCollection<T = unknown>(collection: string): T[] {
  ensureDir();
  const fp = filePath(collection);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    return [];
  }
}

export function writeCollection<T = unknown>(collection: string, data: T[]): void {
  ensureDir();
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2));
}

export function getById<T extends { id: string }>(collection: string, id: string): T | undefined {
  return readCollection<T>(collection).find((item) => item.id === id);
}

export function upsert<T extends { id: string }>(collection: string, item: T): T {
  const items = readCollection<T>(collection);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...item, updated_at: new Date().toISOString() };
  } else {
    (item as any).created_at = new Date().toISOString();
    items.push(item);
  }
  writeCollection(collection, items);
  return item;
}

export function remove(collection: string, id: string): boolean {
  const items = readCollection<{ id: string }>(collection);
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return false;
  writeCollection(collection, filtered);
  return true;
}

export function getSettings(): Record<string, string> {
  ensureDir();
  const fp = path.join(DATA_DIR, "settings.json");
  if (!fs.existsSync(fp)) return {};
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    return {};
  }
}

export function saveSettings(data: Record<string, string>): void {
  ensureDir();
  const fp = path.join(DATA_DIR, "settings.json");
  const existing = getSettings();
  fs.writeFileSync(fp, JSON.stringify({ ...existing, ...data }, null, 2));
}
