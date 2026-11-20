import { useEffect, useState } from 'react';
import { presets } from '../model.js';
import { discoveryHomes, housingNeeds } from './listings.js';

export const modes = {
  walk: 'Walk only',
  transit: 'Walk + bus',
  missed: 'Walk + bus · longer waits'
};
const ids = new Set(discoveryHomes.map(home => home.id));

function restoreRoutine(data) {
  if (!data || !Array.isArray(data.days) || data.days.length !== 3 ||
      !data.days.every(n => Number.isInteger(n) && n >= 0 && n <= 7) ||
      !Number.isInteger(data.budget) || data.budget < 0 || data.budget > 10000 ||
      !Number.isFinite(data.value) || data.value < 0 || data.value > 100) return presets.central;
  return {...data, mode:Object.hasOwn(modes,data.mode) ? data.mode : 'walk'};
}

function restoreDeck(data) {
  const used = new Set();
  const swipes = Array.isArray(data?.swipes) ? data.swipes.filter(entry => {
    if (!ids.has(entry?.id) || used.has(entry.id) || !['save','pass'].includes(entry.action)) return false;
    used.add(entry.id);
    return true;
  }) : [];
  const needs = Array.isArray(data?.needs) ? data.needs.filter(need => Object.hasOwn(housingNeeds,need)) : [];
  const notes = Object.fromEntries(Object.entries(data?.notes ?? {}).filter(([id,value]) =>
    ids.has(id) && typeof value === 'string').map(([id,value]) => [id,value.slice(0,300)]));
  return {swipes, needs, onlyFit:data?.onlyFit === true, notes};
}

function useStored(key, restore) {
  const [value, setValue] = useState(() => {
    try { return restore(JSON.parse(localStorage.getItem(key))); }
    catch { return restore(null); }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Continue when storage is unavailable. */ }
  }, [key,value]);
  return [value,setValue];
}

export const useRoutine = () => useStored('homebase.routine.v1',restoreRoutine);
export const useDeck = () => useStored('homebase.discovery.v1',restoreDeck);
