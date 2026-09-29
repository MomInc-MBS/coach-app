import test from 'node:test';
import assert from 'node:assert/strict';
import fdc from '../food/nutrition-fdc.json' with {type:'json'};

const FOOD101_LABELS = ['apple pie', 'baby back ribs', 'baklava', 'beef carpaccio', 'beef tartare', 'beet salad', 'beignets', 'bibimbap', 'bread pudding', 'breakfast burrito', 'bruschetta', 'caesar salad', 'cannoli', 'caprese salad', 'carrot cake', 'ceviche', 'cheesecake', 'cheese plate', 'chicken curry', 'chicken quesadilla', 'chicken wings', 'chocolate cake', 'chocolate mousse', 'churros', 'clam chowder', 'club sandwich', 'crab cakes', 'creme brulee', 'croque madame', 'cup cakes', 'deviled eggs', 'donuts', 'dumplings', 'edamame', 'eggs benedict', 'escargots', 'falafel', 'filet mignon', 'fish and chips', 'foie gras', 'french fries', 'french onion soup', 'french toast', 'fried calamari', 'fried rice', 'frozen yogurt', 'garlic bread', 'gnocchi', 'greek salad', 'grilled cheese sandwich', 'grilled salmon', 'guacamole', 'gyoza', 'hamburger', 'hot and sour soup', 'hot dog', 'huevos rancheros', 'hummus', 'ice cream', 'lasagna', 'lobster bisque', 'lobster roll sandwich', 'macaroni and cheese', 'macarons', 'miso soup', 'mussels', 'nachos', 'omelette', 'onion rings', 'oysters', 'pad thai', 'paella', 'pancakes', 'panna cotta', 'peking duck', 'pho', 'pizza', 'pork chop', 'poutine', 'prime rib', 'pulled pork sandwich', 'ramen', 'ravioli', 'red velvet cake', 'risotto', 'samosa', 'sashimi', 'scallops', 'seaweed salad', 'shrimp and grits', 'spaghetti bolognese', 'spaghetti carbonara', 'spring rolls', 'steak', 'strawberry shortcake', 'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna tartare', 'waffles'];

test('every Food-101 label resolves to a finite, sane FDC entry',()=>{
 assert.equal(FOOD101_LABELS.length,101);
 for(const label of FOOD101_LABELS){
  const entry=fdc[label];
  assert.ok(entry,`missing entry for "${label}"`);
  assert.ok(Number.isFinite(entry.fdcId)&&entry.fdcId>0,`${label}: fdcId`);
  assert.ok(typeof entry.description==='string'&&entry.description.length>0,`${label}: description`);
  assert.ok(typeof entry.servingName==='string'&&entry.servingName.length>0,`${label}: servingName`);
  assert.ok(Number.isFinite(entry.servingG)&&entry.servingG>0,`${label}: servingG`);
  assert.ok(Number.isFinite(entry.kcal)&&entry.kcal>=0,`${label}: kcal`);
  assert.ok(Number.isFinite(entry.proteinG)&&entry.proteinG>=0,`${label}: proteinG`);
  assert.ok(Number.isFinite(entry.fatG)&&entry.fatG>=0,`${label}: fatG`);
  assert.ok(Number.isFinite(entry.carbsG)&&entry.carbsG>=0,`${label}: carbsG`);
  assert.ok(Array.isArray(entry.vitamins)&&entry.vitamins.length<=2,`${label}: vitamins`);
  for(const v of entry.vitamins){
   assert.ok(typeof v.name==='string'&&v.name.length>0,`${label}: vitamin name`);
   assert.ok(Number.isFinite(v.amount)&&v.amount>=0,`${label}: vitamin amount`);
   assert.ok(typeof v.unit==='string'&&v.unit.length>0,`${label}: vitamin unit`);
  }
 }
 assert.equal(Object.keys(fdc).length,101,'no extra or missing labels in food/nutrition-fdc.json');
});
