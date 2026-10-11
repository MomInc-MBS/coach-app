/**
 * Typed commands understood by the local actual.dj deck controls.
 * @typedef {{action:'automix', enabled:boolean} | {action:'mix-next'} | {action:'fade', seconds:4|8|16} | {action:'deck-control', deck:'a'|'b', control:'play'|'pause'}} DJCommand
 */

const MAX_COMMAND_LENGTH=80;

/**
 * Parse a small, explicit set of local deck commands. This function has no
 * browser, network, provider, speech-recognition, or evaluation side effects.
 * @param {unknown} text
 * @returns {DJCommand|null}
 */
export function parseDJCommand(text) {
  if(typeof text!=='string'||text.length>MAX_COMMAND_LENGTH)return null;
  const command=text.trim().toLowerCase().replace(/\s+/g,' ');
  if(command==='start auto dj')return {action:'automix',enabled:true};
  if(command==='stop auto dj')return {action:'automix',enabled:false};
  if(command==='mix next')return {action:'mix-next'};
  const fade=command.match(/^fade (4|8|16) seconds$/);
  if(fade)return {action:'fade',seconds:Number(fade[1])};
  const deck=command.match(/^(play|pause) (?:deck )?([ab])$/);
  if(deck)return {action:'deck-control',deck:deck[2],control:deck[1]};
  return null;
}
