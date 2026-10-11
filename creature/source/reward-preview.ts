import {CreatureViewer} from './viewer';
import {fresh,REGIONS} from './creator/design';
import {findTexture,textureDefaultMetalness,findColor,findPalette} from './creator/materials-registry';
import {isGranted} from './creator/unlock-store';

// Reuse the real coach and material renderer. This recipe never reaches storage,
// the equipped coach, or the editor's locked-item preview path.
export function mountOriginalRewardPreview(host:HTMLElement,reward:{kind:'texture'|'color'|'palette';id:string}) {
 if(!isGranted(reward.kind,reward.id,'myr5'))throw Error('This cosmetic has not been earned.');
 const texture=reward.kind==='texture'?findTexture(reward.id):findTexture('clay');
 if(!texture||reward.kind==='palette'&&!findPalette(reward.id)||reward.kind==='color'&&!/^#[0-9a-f]{6}$/i.test(reward.id)&&!findColor(reward.id))throw Error('This cosmetic is unavailable.');
 const recipe=fresh(),colorId=reward.kind==='texture'?texture.defaultColorId:reward.id;
 recipe.golden=false;
 recipe.materials=Object.fromEntries(REGIONS.filter(region=>region!=='eye').map(region=>[region,{textureId:texture.id,colorId,sparkle:0,metallic:textureDefaultMetalness(texture.id)??0}]));
 const viewer=new CreatureViewer(host,new URL('../',import.meta.url).href,false);
 viewer.renderer.domElement.setAttribute('aria-label',`Original MYR5 coach wearing the earned ${reward.kind}`);
 viewer.setSettings({...viewer.settings,reduced:true,amount:0});viewer.setMaxFps(12);viewer.setPaused(true);viewer.setStage('overlay');
 const resize=new ResizeObserver(()=>{if(!viewer.disposed&&viewer.rig)viewer.warm();});resize.observe(host);
 const ready=viewer.setRecipe(recipe).then(loaded=>{
  if(!loaded||viewer.disposed)return false;
  host.dataset.ready='true';host.dataset.body=recipe.body;host.dataset.kind=reward.kind;host.dataset.rewardId=reward.id;
  viewer.warm();viewer.setAwake(false);return true;
 });
 return {ready,dispose:()=>{resize.disconnect();viewer.dispose();}};
}

export function cosmeticRewardName(kind:string,id:string) {
 return (kind==='texture'?findTexture(id):kind==='color'?findColor(id):findPalette(id))?.displayName||id;
}
