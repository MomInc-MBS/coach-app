// One-off: maps each of the 101 Food-101 scanner labels to a USDA FoodData Central food and writes
// food/nutrition-fdc.json ({label: {fdcId,description,servingName,servingG,kcal,proteinG,fatG,carbsG,
// vitamins}}). Run with: node scripts/build-food-fdc.mjs
//
// Source data: FDC's bulk CSV downloads (Survey/FNDDS, SR Legacy, Foundation) instead of the rate-limited
// (10 req/window) DEMO_KEY search API -- one download covers all 101 labels. Cached in FDC_CACHE_DIR
// (default: an OS temp folder) so re-runs are instant.
//
// ponytail: hand-rolled `","`-boundary CSV split (unescaping "" -> ") instead of a csv-parser dependency.
// These bulk files never nest a literal `","` inside a field (checked on 2026 vintage files). Swap in a
// real parser if a future USDA release breaks that assumption.
import {existsSync} from 'node:fs';
import {mkdir, readFile, writeFile, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const CACHE_DIR = process.env.FDC_CACHE_DIR || join(tmpdir(), 'myr5-fdc-cache');
const DATASETS = [
 // priority order: FNDDS ("as eaten" dishes) first, per the brief -- suits mixed dishes like pad thai.
 {key: 'survey', zip: 'FoodData_Central_survey_food_csv_2024-10-31.zip'},
 {key: 'sr_legacy', zip: 'FoodData_Central_sr_legacy_food_csv_2018-04.zip'},
 {key: 'foundation', zip: 'FoodData_Central_foundation_food_csv_2026-04-30.zip'},
];
const FDC_BASE = 'https://fdc.nal.usda.gov/fdc-datasets/';

// The 101 Food-101 labels, in the model's own order (confirmed against the ethz/food101 HF dataset
// metadata; also what food-worker.mjs emits after replaceAll('_',' ')).
const LABELS = ['apple_pie', 'baby_back_ribs', 'baklava', 'beef_carpaccio', 'beef_tartare', 'beet_salad', 'beignets', 'bibimbap', 'bread_pudding', 'breakfast_burrito', 'bruschetta', 'caesar_salad', 'cannoli', 'caprese_salad', 'carrot_cake', 'ceviche', 'cheesecake', 'cheese_plate', 'chicken_curry', 'chicken_quesadilla', 'chicken_wings', 'chocolate_cake', 'chocolate_mousse', 'churros', 'clam_chowder', 'club_sandwich', 'crab_cakes', 'creme_brulee', 'croque_madame', 'cup_cakes', 'deviled_eggs', 'donuts', 'dumplings', 'edamame', 'eggs_benedict', 'escargots', 'falafel', 'filet_mignon', 'fish_and_chips', 'foie_gras', 'french_fries', 'french_onion_soup', 'french_toast', 'fried_calamari', 'fried_rice', 'frozen_yogurt', 'garlic_bread', 'gnocchi', 'greek_salad', 'grilled_cheese_sandwich', 'grilled_salmon', 'guacamole', 'gyoza', 'hamburger', 'hot_and_sour_soup', 'hot_dog', 'huevos_rancheros', 'hummus', 'ice_cream', 'lasagna', 'lobster_bisque', 'lobster_roll_sandwich', 'macaroni_and_cheese', 'macarons', 'miso_soup', 'mussels', 'nachos', 'omelette', 'onion_rings', 'oysters', 'pad_thai', 'paella', 'pancakes', 'panna_cotta', 'peking_duck', 'pho', 'pizza', 'pork_chop', 'poutine', 'prime_rib', 'pulled_pork_sandwich', 'ramen', 'ravioli', 'red_velvet_cake', 'risotto', 'samosa', 'sashimi', 'scallops', 'seaweed_salad', 'shrimp_and_grits', 'spaghetti_bolognese', 'spaghetti_carbonara', 'spring_rolls', 'steak', 'strawberry_shortcake', 'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna_tartare', 'waffles'].map(s => s.replaceAll('_', ' '));

// Query overrides for labels where a plain word match picks a bad FDC entry. The first 12 are the
// existing aliases already hand-picked for the SR28 fuzzy search in nutrition.mjs -- reused here so
// both lookup paths agree on what these dishes mean.
const QUERY = {
 'french fries': 'potato french fries', 'ice cream': 'ice creams', 'hamburger': 'hamburger',
 'hot dog': 'frankfurter', 'grilled salmon': 'salmon cooked', 'grilled cheese sandwich': 'sandwich cheese',
 'macaroni and cheese': 'macaroni cheese', 'steak': 'beef steak cooked', 'french toast': 'french toast',
 'fried rice': 'rice fried', 'sashimi': 'fish raw', 'omelette': 'egg omelet',
 // additional overrides found by inspecting two automated passes against the bulk CSVs (see the report
 // for which of these are close substitutes rather than an exact FDC match -- cannoli, macarons, poutine,
 // risotto and takoyaki have no FDC entry at all in Survey/SR Legacy/Foundation).
 'escargots': 'snails cooked', 'foie gras': 'goose liver pate', 'cheese plate': 'cheese cheddar',
 'spaghetti bolognese': 'spaghetti with meat sauce', 'spaghetti carbonara': 'pasta cream sauce meat restaurant',
 'huevos rancheros': 'huevos rancheros', 'peking duck': 'duck peking style', 'prime rib': 'beef prime rib roasted',
 'club sandwich': 'club sandwich', 'croque madame': 'sandwich egg cheese ham', 'cup cakes': 'cupcake',
 'red velvet cake': 'red velvet cake', 'panna cotta': 'custard', 'shrimp and grits': 'shrimp and grits',
 'beef carpaccio': 'beef carpaccio raw', 'tuna tartare': 'tuna raw', 'beef tartare': 'tartare',
 'baby back ribs': 'pork ribs barbecued', 'filet mignon': 'beef steak lean cooked', 'pork chop': 'pork chop fat eaten',
 'beet salad': 'beets fresh cooked', 'seaweed salad': 'seaweed pickled',
 'fried calamari': 'squid fried', 'lobster roll sandwich': 'lobster salad', 'pulled pork sandwich': 'pulled pork barbecue sauce',
 'caprese salad': 'mozzarella tomato basil oil vinegar dressing', 'lobster bisque': 'soup bisque',
 'spring rolls': 'egg roll meatless', 'gyoza': 'wonton dumpling pot sticker fried', 'donuts': 'doughnut nfs',
 'pizza': 'pizza cheese restaurant fast food', 'fish and chips': 'fish cod fried',
 // no FDC entry anywhere in these three datasets for these five -- nearest defensible single-food proxy:
 'risotto': 'rice white cooked', 'poutine': 'potato french fries nfs', 'takoyaki': 'octopus',
 'cannoli': 'cream puff eclair custard filled', 'macarons': 'cookie meringue',
};
// Labels with no real FDC entry for the dish itself -- QUERY above points them at the closest single-food
// stand-in; flag that plainly regardless of the word-coverage score (which will read 1.0 since the query
// was written to match the stand-in, not the dish).
const KNOWN_PROXY = new Set(['risotto', 'poutine', 'takoyaki', 'cannoli', 'macarons', 'beef carpaccio', 'shrimp and grits', 'fish and chips']);

const STOPWORDS = new Set(['and', 'with', 'the', 'a', 'of', 'in', 'style', 'ns', 'as', 'to', 'or', 'raw', 'cooked']);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = text => norm(text).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w)).map(w => w.replace(/(ies)$/, 'y').replace(/s$/, ''));

// --- tiny CSV reader: fields are always fully quoted and never contain the 4-char sequence `","`. ---
// A handful of Foundation lab-sample rows have a stray embedded newline inside the description (verified
// against the 2026-04-30 dump, e.g. fdc_id 321829); a line-based split turns one such row into two ragged
// ones. We drop rows that don't match the header's column count rather than reconstructing them -- they're
// obscure lab-sample records no Food-101 label would ever match anyway.
function parseCsv(text) {
 const lines = text.split(/\r?\n/);
 if (lines.at(-1) === '') lines.pop();
 const rows = lines.map(line => line.slice(1, -1).split('","').map(f => f.replace(/""/g, '"')));
 const cols = rows[0].length;
 return rows.filter(r => r.length === cols);
}
async function readCsv(path) { return parseCsv(await readFile(path, 'utf8')); }

async function ensureDataset({key, zip}) {
 const zipPath = join(CACHE_DIR, zip);
 const extractDir = join(CACHE_DIR, key);
 if (existsSync(extractDir)) return findCsvRoot(extractDir);
 await mkdir(CACHE_DIR, {recursive: true});
 if (!existsSync(zipPath)) {
  console.log(`Downloading ${zip}...`);
  const res = await fetch(FDC_BASE + zip);
  if (!res.ok) throw new Error(`${zip}: HTTP ${res.status}`);
  await writeFile(zipPath, Buffer.from(await res.arrayBuffer()));
 }
 await mkdir(extractDir, {recursive: true});
 const unzip = spawnSync('unzip', ['-oq', zipPath, '-d', extractDir]);
 if (unzip.status !== 0) throw new Error(`unzip ${zip} failed: ${unzip.stderr}`);
 return findCsvRoot(extractDir);
}
async function findCsvRoot(dir) {
 const entries = await readdir(dir, {withFileTypes: true});
 const sub = entries.find(e => e.isDirectory());
 return sub ? join(dir, sub.name) : dir;
}

async function loadDataset(spec) {
 const root = await ensureDataset(spec);
 const [foodRows, nutrientRows, portionRows, nutrientDictRows, measureUnitRows] = await Promise.all(
  ['food.csv', 'food_nutrient.csv', 'food_portion.csv', 'nutrient.csv', 'measure_unit.csv'].map(f => readCsv(join(root, f)))
 );
 const foods = new Map(); // fdcId -> {description, dataType}
 for (const [fdcId, dataType, description] of foodRows.slice(1)) foods.set(fdcId, {description, dataType});
 const measureUnits = new Map();
 for (const [id, name] of measureUnitRows.slice(1)) measureUnits.set(id, name);
 // nutrient.csv: id,name,unit_name,nutrient_nbr,rank -- we key by nutrient_nbr (the stable USDA number).
 const nutrientIdByNumber = new Map();
 for (const [id, , , nbr] of nutrientDictRows.slice(1)) nutrientIdByNumber.set(nbr, id);
 return {foods, measureUnits, nutrientRows: nutrientRows.slice(1), portionRows: portionRows.slice(1), nutrientIdByNumber};
}

// USDA nutrient numbers we need, and (for vitamins) the %DV table -- mirrors food/pyramid-tiles.mjs's
// VITAMIN_DV so the top-2-by-%DV pick here matches what that screen would compute at runtime.
const MACRO_NBR = {kcal: '208', proteinG: '203', fatG: '204', carbsG: '205'};
const VITAMIN_NBR = {vitaminA: '320', vitaminC: '401', vitaminD: '328', vitaminE: '323', vitaminB12: '418', folate: '417'};
const VITAMIN_DV = {vitaminA: 900, vitaminC: 90, vitaminD: 20, vitaminE: 15, vitaminB12: 2.4, folate: 400};
const VITAMIN_NAME = {vitaminA: 'Vitamin A', vitaminC: 'Vitamin C', vitaminD: 'Vitamin D', vitaminE: 'Vitamin E', vitaminB12: 'Vitamin B12', folate: 'Folate'};
const VITAMIN_UNIT = {vitaminA: 'µg RAE', vitaminC: 'mg', vitaminD: 'µg', vitaminE: 'mg', vitaminB12: 'µg', folate: 'µg'};

function scoreCandidate(queryWords, description) {
 const descWords = words(description);
 const matched = queryWords.filter(w => descWords.includes(w)).length;
 const coverage = matched / queryWords.length;
 return {coverage, length: descWords.length};
}

function bestMatch(dataset, queryWords) {
 let best = null;
 for (const [fdcId, {description}] of dataset.foods) {
  const {coverage, length} = scoreCandidate(queryWords, description);
  if (coverage === 0) continue;
  if (!best || coverage > best.coverage || (coverage === best.coverage && length < best.length)) {
   best = {fdcId, description, coverage, length};
  }
 }
 return best;
}

// Every usable (nonzero gram, nameable) FDC portion row for a food, in the dataset's own seq_num order.
function rawPortions(dataset, fdcId) {
 const rows = dataset.portionRows.filter(r => r[1] === fdcId).sort((a, b) => Number(a[2] || 0) - Number(b[2] || 0));
 const out = [];
 for (const row of rows) {
  const [, , , amount, measureUnitId, portionDescription, modifier, gramWeight] = row;
  const grams = Number(gramWeight);
  if (!Number.isFinite(grams) || grams <= 0) continue;
  let name = portionDescription && portionDescription !== 'Quantity not specified' ? portionDescription : '';
  // `modifier` is usually free text ("serving") but sometimes carries a bare measure_unit_id reference
  // code (e.g. "90000") instead, typically paired with an empty portion_description -- skip those as
  // unlabeled rather than showing the raw code.
  if (!name && modifier && !/^\d+$/.test(modifier)) name = amount ? `${amount} ${modifier}` : modifier;
  if (!name) { const unit = dataset.measureUnits.get(measureUnitId); if (unit && unit !== 'undetermined') name = amount ? `${amount} ${unit}` : unit; }
  if (name) out.push({name: name.trim(), servingG: grams});
 }
 return out;
}

// A photo is of a plated meal, not a lab reference amount -- FDC's *first* portion is often a garnish-size
// or whole-recipe outlier (french fries "1 fry" 5 g, chocolate mousse "1 recipe yield" 808 g). Rule (per
// conductor review): drop portions that read as a crumb/garnish/whole-batch unit unless that leaves
// nothing; from what's left, take whichever is closest to a 150 g plate by log distance (log distance
// treats "half of 150" and "double 150" as equally far, which a plain gram difference would not); if
// everything left is still under 60 g (sushi, wings, dumplings, mussels...), report N of that single unit
// instead (N = round(150/unit), capped at 12) rather than one unrealistic bite.
const EXCLUDE_PORTION_RE = /recipe|yield|miniature|bite|tiny|fry\b|chip\b|pod\b|tbsp|tablespoon|teaspoon|cracker-size/i;
const DIP_LABELS = new Set(['guacamole', 'hummus']); // a dip is eaten a couple tablespoons at a time, not by the cup
function closestByLogDistance(list, targetG) {
 return list.reduce((best, p) => {
  const d = Math.abs(Math.log(p.servingG) - Math.log(targetG));
  return !best || d < best.d ? {...p, d} : best;
 }, null);
}
function pluralizeUnit(name) {
 const m = /^1\s+([a-zA-Z][a-zA-Z ]*)$/.exec(name); // "1 cookie" -> "cookie"; anything fancier stays "pieces"
 if (!m) return null;
 const noun = m[1];
 if (/^oz$/i.test(noun)) return noun; // abbreviated units (FDC's "1 oz") don't take an 's'
 if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + 'ies'; // patty -> patties, not pattys
 return /[sxz]$|[cs]h$/i.test(noun) ? noun + 'es' : noun + 's';
}
function pickPortion(dataset, fdcId, label) {
 const all = rawPortions(dataset, fdcId);
 if (!all.length) return null;
 if (DIP_LABELS.has(label)) {
  const tbsp = all.find(p => /tablespoon|tbsp/i.test(p.name));
  if (tbsp) return {servingName: `2 ${tbsp.name.replace(/^1\s+/, '')}`, servingG: round(tbsp.servingG * 2, 0), rule: 'dip: 2x tablespoon portion'};
  const closest = closestByLogDistance(all, 30);
  return {servingName: closest.name, servingG: closest.servingG, rule: 'dip: closest to 30 g'};
 }
 const kept = all.filter(p => !EXCLUDE_PORTION_RE.test(p.name));
 const candidates = kept.length ? kept : all;
 const prefix = kept.length ? '' : 'no non-excluded portion; ';
 if (candidates.every(p => p.servingG < 60)) {
  const unit = candidates[0];
  const n = Math.min(12, Math.max(1, Math.round(150 / unit.servingG)));
  const name = n === 1 ? unit.name : `${n} ${pluralizeUnit(unit.name) || 'pieces'}`;
  return {servingName: name, servingG: round(n * unit.servingG, 0), rule: `${prefix}small units only, x${n} (${unit.servingG} g each)`};
 }
 const closest = closestByLogDistance(candidates, 150);
 return {servingName: closest.name, servingG: closest.servingG, rule: `${prefix}closest to 150 g`};
}

function nutrientAmountPer100g(dataset, fdcId, nutrientNbr) {
 // Foundation/SR Legacy food_nutrient.csv key nutrient_id by nutrient.csv's internal id (e.g. 1008 for
 // Energy); Survey/FNDDS's food_nutrient.csv keys it by the raw USDA nutrient number instead (208). No
 // id/nbr collide (checked), so matching either is safe and dataset-agnostic.
 const nutrientId = dataset.nutrientIdByNumber.get(nutrientNbr);
 const row = dataset.nutrientRows.find(r => r[1] === fdcId && (r[2] === nutrientId || r[2] === nutrientNbr));
 return row ? Number(row[3]) : null;
}

function round(v, d = 1) { const m = 10 ** d; return Math.round(v * m) / m; }

async function buildEntry(label, datasets) {
 const overrideQuery = QUERY[label] || label;
 const queryWords = words(overrideQuery);
 let picked = null, dataset = null;
 for (const ds of datasets) {
  const candidate = bestMatch(ds, queryWords);
  if (candidate && candidate.coverage === 1) { picked = candidate; dataset = ds; break; }
  if (candidate && (!picked || candidate.coverage > picked.coverage)) { picked = candidate; dataset = ds; }
 }
 if (!picked) return {label, entry: null, note: 'no FDC match at all'};
 const {fdcId, description, coverage} = picked;
 const portion = pickPortion(dataset, fdcId, label);
 const servingG = portion?.servingG ?? 100;
 const servingName = portion?.servingName ?? '100 g';
 const scale = servingG / 100;
 const macros = {};
 for (const [key, nbr] of Object.entries(MACRO_NBR)) {
  const per100 = nutrientAmountPer100g(dataset, fdcId, nbr);
  macros[key] = per100 == null ? null : round(per100 * scale, key === 'kcal' ? 0 : 1);
 }
 const vitaminPcts = [];
 for (const [key, nbr] of Object.entries(VITAMIN_NBR)) {
  const per100 = nutrientAmountPer100g(dataset, fdcId, nbr);
  if (per100 == null) continue;
  const amount = round(per100 * scale, 2);
  const pct = amount / VITAMIN_DV[key];
  if (pct > 0) vitaminPcts.push({key, amount, pct});
 }
 vitaminPcts.sort((a, b) => b.pct - a.pct);
 const vitamins = vitaminPcts.slice(0, 2).map(v => ({name: VITAMIN_NAME[v.key], amount: v.amount, unit: VITAMIN_UNIT[v.key]}));
 const notes = [];
 if (!portion) notes.push('fell back to 100 g (no usable FDC portion)');
 if (coverage < 1 || KNOWN_PROXY.has(label)) notes.push(`approximate match only (word coverage ${coverage.toFixed(2)}) -- no exact FDC entry for this dish`);
 return {
  label,
  entry: {fdcId: Number(fdcId), description, servingName, servingG, ...macros, vitamins},
  note: notes.join('; ') || null,
  coverage, dataset: dataset.key, portionRule: portion?.rule ?? 'no FDC portion at all',
 };
}

const datasets = [];
for (const spec of DATASETS) { console.log(`Loading ${spec.key}...`); datasets.push({key: spec.key, ...await loadDataset(spec)}); }

const result = {};
const fallbacks = [];
const report = [];
for (const label of LABELS) {
 const {entry, note, coverage, dataset, portionRule} = await buildEntry(label, datasets);
 if (!entry) { fallbacks.push(`${label}: NO MATCH`); continue; }
 result[label] = entry;
 report.push(`${label.padEnd(28)} -> [${dataset}] fdc:${entry.fdcId} "${entry.description}" (coverage ${coverage.toFixed(2)}, ${entry.servingName}, ${entry.servingG} g, ${entry.kcal} kcal) [${portionRule}]`);
 if (note) fallbacks.push(`${label}: ${note}`);
}

console.log(report.join('\n'));
console.log('\n--- fallbacks / notes ---');
console.log(fallbacks.length ? fallbacks.join('\n') : '(none)');
console.log(`\n${Object.keys(result).length} / ${LABELS.length} labels resolved.`);

await mkdir('food', {recursive: true});
await writeFile('food/nutrition-fdc.json', JSON.stringify(result, null, 1) + '\n');
console.log('Wrote food/nutrition-fdc.json');
