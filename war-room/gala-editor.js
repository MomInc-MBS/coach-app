import { makeDyePreview, makePartPreview, makeWeaponPreview } from './gala-option-previews.js';

const PART_GROUPS = [
  { title: 'Species & alien form', ids: ['body', 'skin', 'face', 'hair', 'facial'] },
  { title: 'Head & neckwear', ids: ['headwear', 'neck'] },
  { title: 'Formalwear', ids: ['torso'] },
  { title: 'Shoulders, sleeves & gloves', ids: ['shoulders', 'arms', 'hands'] },
  { title: 'Pants & footwear', ids: ['legs', 'feet'] },
  { title: 'Accessories', ids: ['held', 'back', 'base'] },
  { title: 'Companion', ids: ['pet'] }
];

function optionButton(doc, { label, preview, selected, value, onClick, className = '' }) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = `gala-option${className ? ` ${className}` : ''}`;
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-pressed', String(selected));
  button.dataset.optionValue = String(value);
  button.append(preview);
  const caption = doc.createElement('span');
  caption.className = 'gala-option-name';
  caption.textContent = label;
  button.append(caption);
  button.addEventListener('click', () => onClick(button));
  return button;
}

export function createGalaEditor({ document: doc, avatar, weapons, look, onPart, onDye, onWeapon, locked, previewDraw = avatar.draw }) {
  const make = (tag, className, text) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  function partSections(ids) {
    const wanted = new Set(ids);
    const entries = PART_GROUPS.map(group => ({ ...group, ids: group.ids.filter(id => wanted.has(id)) })).filter(group => group.ids.length);
    return entries.map(group => {
      const fieldset = make('fieldset', 'gala-editor-group');
      const legend = make('legend', '', group.title);
      fieldset.append(legend);
      for (const id of group.ids) {
        const section = avatar.sections.find(item => item.id === id);
        if (!section) continue;
        const part = make('section', 'gala-editor-part');
        part.dataset.part = id;
        const heading = make('h4', '', section.label);
        const grid = make('div', 'gala-option-grid');
        const current = look.parts[id] ?? 0;
        const values = section.choices.includes(current) ? section.choices : [current, ...section.choices];
        for (const value of values) {
          const label = section.names[value] || `${section.label} ${value + 1}`;
          const button = optionButton(doc, {
            label, value, selected: value === current,
            preview: makePartPreview(doc, avatar, look, id, value, previewDraw),
            onClick: target => {
              grid.querySelectorAll('.gala-option').forEach(item => item.setAttribute('aria-pressed', String(item === target)));
              onPart(id, value, label);
            }
          });
          button.dataset.galaPart = id;
          grid.append(button);
        }
        part.append(heading, grid);
        fieldset.append(part);
      }
      return fieldset;
    });
  }

  function dyeControl() {
    const part = make('section', 'gala-editor-part gala-dye-part');
    part.append(make('h4', '', 'Silk colour'));
    const grid = make('div', 'gala-option-grid gala-dye-grid');
    avatar.dyes.forEach((color, value) => {
      const button = optionButton(doc, {
        label: `Silk ${value + 1}`, value, selected: value === look.dye,
        preview: makeDyePreview(doc, avatar, look, value), className: 'gala-dye-option',
        onClick: target => {
          grid.querySelectorAll('.gala-option').forEach(item => item.setAttribute('aria-pressed', String(item === target)));
          onDye(value);
        }
      });
      button.dataset.galaPart = 'dye';
      grid.append(button);
    });
    part.append(grid);
    return part;
  }

  function weaponControl() {
    const root = make('div', 'gala-editor-weapons');
    const typeHeading = make('h4', '', 'Weapon');
    const typeGrid = make('div', 'gala-option-grid gala-weapon-grid');
    const chosen = look.weapon || { type: 'rapier', tier: 0 };
    for (const type of weapons.types) {
      const current = { type: type.id, tier: 0 };
      const button = optionButton(doc, {
        label: type.name, value: type.id, selected: type.id === chosen.type,
        preview: makeWeaponPreview(doc, weapons, current),
        onClick: target => {
          typeGrid.querySelectorAll('.gala-option').forEach(item => item.setAttribute('aria-pressed', String(item === target)));
          onWeapon({ type: type.id, tier: type.id === chosen.type ? chosen.tier : 0 });
        }
      });
      button.dataset.galaWeapon = 'type';
      button.dataset.weaponType = type.id;
      typeGrid.append(button);
    }
    const tierHeading = make('h4', '', 'Upgrade');
    const tierGrid = make('div', 'gala-option-grid gala-tier-grid');
    const previewStatus = make('p', 'help gala-preview-status');
    previewStatus.setAttribute('role', 'status');
    for (let tier = 0; tier < weapons.tiers.length; tier++) {
      const weapon = { type: chosen.type, tier };
      const isLocked = Boolean(locked?.(weapon));
      const button = optionButton(doc, {
        label: weapons.tiers[tier], value: tier,
        selected: tier === chosen.tier, preview: makeWeaponPreview(doc, weapons, weapon),
        className: isLocked ? 'is-locked' : '',
        onClick: target => {
          if (isLocked) {
            previewStatus.textContent = `Preview only · How to unlock ${weapons.tiers[tier]}: ${weapons.requirements(weapon).label}.`;
            return;
          }
          previewStatus.textContent = '';
          tierGrid.querySelectorAll('.gala-option').forEach(item => item.setAttribute('aria-pressed', String(item === target)));
          onWeapon({ type: chosen.type, tier });
        }
      });
      button.dataset.galaWeapon = 'tier';
      if (isLocked) {
        button.dataset.locked = 'true';
      }
      tierGrid.append(button);
    }
    root.append(typeHeading, typeGrid, tierHeading, tierGrid, previewStatus, make('p', 'help', 'Workout performance earns weapon upgrades.'));
    return root;
  }

  return { parts: partSections, dye: dyeControl, weapons: weaponControl };
}
