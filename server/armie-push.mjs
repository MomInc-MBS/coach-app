// Turns a fired D12 Armie letter into a Web Push send, reusing the EXISTING
// push infrastructure (sendPush in server/push.mjs) -- no changes to
// push.mjs. The in-app inbox is the source of truth (D23); this call is only
// the "you have mail" nudge, and its failure must never lose the letter (the
// letter is already written to the inbox independently of whether this
// succeeds -- see armie-letters-client.mjs).
import {sendPush} from './push.mjs';
import {pickArmieLetter} from '../armie-letters.mjs';

export function armiePushPayload(date, letterId) {
 const letter = pickArmieLetter(letterId, date);
 if (!letter) return null;
 return {title: letter.header, body: letter.lines.join(' '), tag: `myr5-armie-${date}-${letterId}`, url: '/pose.html?panel=armie', kind: 'myr5-armie-letter'};
}

export async function sendArmieLetterPush(env, sub, date, letterId, options) {
 const payload = armiePushPayload(date, letterId);
 if (!payload) return null;
 return sendPush(env, sub, payload, options);
}
