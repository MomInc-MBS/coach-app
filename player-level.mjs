import {COSMETIC_LEVEL_XP,COSMETIC_XP_TARGET,cosmeticLevel,BENCHMARK} from './progression-rules.mjs';
import {readPerformanceProgress} from './performance-progress.mjs';
export const XP_KNOBS=Object.freeze({levels:250,maxXp:COSMETIC_XP_TARGET,...BENCHMARK});
export const LEVEL_XP=COSMETIC_LEVEL_XP;
export const levelFor=cosmeticLevel;
// Aggregate set counts cannot reconstruct performance XP. Use the saved ledger.
export const xpFromHistory=({totalXp=0}={})=>Math.max(0,Number(totalXp)||0);
export const BASELINE_KEY='myr5.xpBaseline.v1';
export function playerLevel(progress,storage=globalThis.localStorage){return cosmeticLevel(progress?.performanceVersion===2?xpFromHistory(progress):readPerformanceProgress({storage}).totalXp);}
