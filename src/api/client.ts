import type { RawAsset, MoveLeg } from '@/data/types';

/**
 * API client for the Google Apps Script backend.
 * Configure the deployed Web App URL via `VITE_API_URL` (.env).
 * When unset, the app runs entirely on local mock data.
 */
const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || '';

export const isConfigured = () => !!API_URL;

export interface MoveRecord {
  id?: string;
  date: string;
  title: string;
  detail: string;
  sources?: MoveLeg[];
  destinations?: MoveLeg[];
  alloc?: Record<string, number>;
}

export interface LineGroup { id: string; name: string }

export interface RemoteSettings {
  goldPricePerBaht?: number;
  whtRate?: number;
  lineConnected?: boolean;
  lineGroups?: LineGroup[];
  linePendingGroups?: LineGroup[];
  lineLead?: { d30: boolean; d7: boolean; d1: boolean };
  lineTypes?: Record<string, boolean>;
  lineTime?: string;
  lineMaturity?: boolean;
  lineMonthly?: boolean;
  lineLargeMove?: boolean;
}

export interface RemoteData {
  assets: RawAsset[];
  moves: MoveRecord[];
  settings: RemoteSettings;
}

interface ApiEnvelope<T> { ok: boolean; data?: T; error?: string }

/** GET all resources. Returns null when no backend is configured. */
export async function fetchAll(): Promise<RemoteData | null> {
  if (!API_URL) return null;
  const res = await fetch(`${API_URL}?resource=all`, { method: 'GET', redirect: 'follow' });
  const json = (await res.json()) as ApiEnvelope<RemoteData>;
  if (!json.ok) throw new Error(json.error || 'fetch failed');
  return json.data!;
}

/**
 * POST an action. Uses text/plain to avoid a CORS preflight that Apps Script
 * web apps cannot answer (they don't handle OPTIONS).
 */
async function post<T>(action: string, payload: unknown): Promise<T> {
  if (!API_URL) throw new Error('ยังไม่ได้ตั้งค่า VITE_API_URL — โหมด mock เท่านั้น');
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!json.ok) throw new Error(json.error || 'request failed');
  return json.data!;
}

export const createAsset = (a: RawAsset) => post<{ id: string }>('createAsset', a);
export const updateAsset = (a: RawAsset) => post<{ id: string }>('updateAsset', a);
export const deleteAsset = (id: string) => post<{ id: string }>('deleteAsset', { id });
export const recordMove = (m: { title: string; detail: string; amount: number; sources?: MoveLeg[]; destinations?: MoveLeg[]; alloc?: Record<string, number> }) =>
  post<{ id: string }>('recordMove', m);
export const deleteMove = (id: string) => post<{ id: string }>('deleteMove', { id });
export const saveSettings = (s: RemoteSettings) => post<RemoteSettings>('saveSettings', s);
/** Removes the group from both the active and pending lists AND has the bot leave
 *  that LINE group, so it can't get silently re-added by a future message there. */
export const ejectLineGroup = (groupId: string) => post<{ lineGroups: LineGroup[]; linePendingGroups: LineGroup[] }>('ejectLineGroup', { groupId });
/** Admin approves a pending group — moves it to the active list and the bot
 *  sends a confirmation message into that group. */
export const acceptLineGroup = (groupId: string) => post<{ lineGroups: LineGroup[]; linePendingGroups: LineGroup[] }>('acceptLineGroup', { groupId });
export const sendTest = () => post<unknown>('sendTest', {});
/** Records a password-gate login attempt (success or failure) to the LoginLog sheet. */
export const logLogin = (success: boolean) =>
  post<{ ok: boolean }>('logLogin', { success, userAgent: navigator.userAgent });
