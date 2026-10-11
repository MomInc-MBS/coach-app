import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDJCommand } from '../actual-dj-commands.mjs';

test('parses the supported local DJ commands', () => {
  const cases = [
    ['start auto dj', { action: 'automix', enabled: true }],
    ['stop auto dj', { action: 'automix', enabled: false }],
    ['mix next', { action: 'mix-next' }],
    ['fade 4 seconds', { action: 'fade', seconds: 4 }],
    ['fade 8 seconds', { action: 'fade', seconds: 8 }],
    ['fade 16 seconds', { action: 'fade', seconds: 16 }],
    ['play A', { action: 'deck-control', deck: 'a', control: 'play' }],
    ['pause B', { action: 'deck-control', deck: 'b', control: 'pause' }],
    ['play deck B', { action: 'deck-control', deck: 'b', control: 'play' }],
    ['pause deck a', { action: 'deck-control', deck: 'a', control: 'pause' }],
  ];

  for (const [input, expected] of cases) {
    assert.deepEqual(parseDJCommand(input), expected, input);
  }
});

test('normalizes case and repeated surrounding/inter-word whitespace', () => {
  assert.deepEqual(parseDJCommand('  START   AUTO DJ  '), {
    action: 'automix', enabled: true,
  });
  assert.deepEqual(parseDJCommand('\tFade   8 seconds\n'), {
    action: 'fade', seconds: 8,
  });
});

test('rejects unsupported, ambiguous, provider, and multi-action requests', () => {
  const rejected = [
    null,
    undefined,
    42,
    {},
    '',
    'start dj',
    'fade 5 seconds',
    'fade 8',
    'play C',
    'play Spotify',
    'play Apple Music',
    'mix next and pause B',
    'start auto dj; fetch("https://example.com")',
    'stop auto dj now',
  ];

  for (const input of rejected) assert.equal(parseDJCommand(input), null, String(input));
});

test('rejects commands longer than the parser bound', () => {
  assert.equal(parseDJCommand(`mix next${' '.repeat(80)}`), null);
});
