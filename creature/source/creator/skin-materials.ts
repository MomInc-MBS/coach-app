import * as T from 'three';

export type SkinMapName='basecolor'|'normal'|'roughness'|'height'|'metalness'|'tintMask'|'ao'|'opacity'|'emissive'|'preview';
export type InstalledSkin={id:string;displayName:string;track:string;maps:Partial<Record<SkinMapName,Uint8Array>>};
export type PaletteTriad={primary:string;secondary:string;accent:string};

const SPACE:Partial<Record<SkinMapName,'srgb'|'linear'>>={basecolor:'srgb',tintMask:'srgb',emissive:'srgb',normal:'linear',roughness:'linear',height:'linear',metalness:'linear',ao:'linear',opacity:'linear'};
function textureFrom(bytes:Uint8Array,colorSpace:'srgb'|'linear',owned:Set<T.Texture>):Promise<T.Texture>{
 const url=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
 return new Promise((resolve,reject)=>new T.TextureLoader().load(url,texture=>{URL.revokeObjectURL(url);texture.colorSpace=colorSpace==='srgb'?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;owned.add(texture);resolve(texture);},undefined,error=>{URL.revokeObjectURL(url);reject(error||new Error('Skin texture could not be decoded.'));}));
}

/** Apply only maps present in the verified packet. Missing maps retain existing material defaults. */
export async function applyInstalledSkin(mesh:T.Mesh,skin:InstalledSkin,palette:PaletteTriad,owned:Set<T.Texture>):Promise<boolean>{
 const entries=Object.entries(skin.maps).filter(([name,bytes])=>name!=='preview'&&!!SPACE[name as SkinMapName]&&bytes instanceof Uint8Array) as [SkinMapName,Uint8Array][];
 if(!entries.length)return false;
 // Some roster models only carry vertex colours. Give them deterministic local
 // cylindrical UVs so an installed finish never silently samples one pixel.
 if(!mesh.geometry.getAttribute('uv')){const position=mesh.geometry.getAttribute('position');mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox!,center=box.getCenter(new T.Vector3()),height=Math.max(1e-6,box.max.y-box.min.y),uv=new Float32Array(position.count*2);for(let i=0;i<position.count;i++){uv[i*2]=.5+Math.atan2(position.getZ(i)-center.z,position.getX(i)-center.x)/(2*Math.PI);uv[i*2+1]=(position.getY(i)-box.min.y)/height;}mesh.geometry.setAttribute('uv',new T.BufferAttribute(uv,2));}
 const loaded=new Map<SkinMapName,T.Texture>();
 try{for(const [name,bytes] of entries)loaded.set(name,await textureFrom(bytes,SPACE[name]!,owned));}
 catch(error){for(const texture of loaded.values()){owned.delete(texture);texture.dispose();}throw error;}
 if(!mesh.geometry.getAttribute('uv2')&&mesh.geometry.getAttribute('uv'))mesh.geometry.setAttribute('uv2',mesh.geometry.getAttribute('uv').clone());
 for(const raw of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
  const material=raw as T.MeshPhysicalMaterial;
  if((loaded.has('basecolor')||loaded.has('tintMask')||loaded.has('emissive'))&&mesh.geometry.getAttribute('uv'))material.defines={...material.defines,USE_UV:''};
  if(loaded.has('normal')){material.normalMap=loaded.get('normal')!;material.normalScale.set(1,1);material.userData.normalConvention='OpenGL +Y';}
  if(loaded.has('roughness'))material.roughnessMap=loaded.get('roughness')!;
  if(loaded.has('height')){material.bumpMap=loaded.get('height')!;material.bumpScale=.018;}
  if(loaded.has('metalness')){material.metalnessMap=loaded.get('metalness')!;material.metalness=1;}
  if(loaded.has('ao'))material.aoMap=loaded.get('ao')!;
  if(loaded.has('opacity')){material.alphaMap=loaded.get('opacity')!;material.transparent=true;material.depthWrite=false;}
  if((loaded.has('basecolor')||loaded.has('tintMask')||loaded.has('emissive'))&&mesh.geometry.getAttribute('uv')){
   const previous=material.onBeforeCompile;
   material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);
    shader.uniforms.myr5SkinMask={value:loaded.get('tintMask')};
    shader.uniforms.myr5SkinPrimary={value:new T.Color(palette.primary)};
    shader.uniforms.myr5SkinSecondary={value:new T.Color(palette.secondary)};
    shader.uniforms.myr5SkinAccent={value:new T.Color(palette.accent)};
    if(loaded.has('basecolor'))shader.uniforms.myr5SkinBasecolor={value:loaded.get('basecolor')};
    if(loaded.has('emissive'))shader.uniforms.myr5SkinEmissive={value:loaded.get('emissive')};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vMyr5SkinUv;').replace('#include <uv_vertex>','#include <uv_vertex>\nvMyr5SkinUv=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D myr5SkinMask;\nuniform sampler2D myr5SkinBasecolor;\nuniform sampler2D myr5SkinEmissive;\nuniform vec3 myr5SkinPrimary;\nuniform vec3 myr5SkinSecondary;\nuniform vec3 myr5SkinAccent;\nvarying vec2 vMyr5SkinUv;');
    // The texture is tagged SRGBColorSpace, so WebGL's sRGB sampling decodes the mask to linear.
    const layers=loaded.has('tintMask')?'vec3 skinBase=texture2D(myr5SkinMask,vMyr5SkinUv).rgb;\nfloat skinMask=dot(skinBase,vec3(0.2126,0.7152,0.0722));\nvec3 skinPalette=skinMask<0.5?mix(myr5SkinSecondary,myr5SkinPrimary,skinMask*2.0):mix(myr5SkinPrimary,myr5SkinAccent,(skinMask-0.5)*2.0);\ndiffuseColor.rgb=skinBase*skinPalette;':loaded.has('basecolor')?'diffuseColor.rgb*=texture2D(myr5SkinBasecolor,vMyr5SkinUv).rgb;':'';
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+layers);
    if(loaded.has('emissive'))shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=texture2D(myr5SkinEmissive,vMyr5SkinUv).rgb*0.85;');
   };
   const priorKey=material.customProgramCacheKey.bind(material),mapKey=[...loaded.keys()].sort().join(',');material.customProgramCacheKey=()=>priorKey()+'|myr5-installed-skin-triad-v2|'+mapKey;
   material.userData.installedSkinId=skin.id;
  }
  material.needsUpdate=true;
 }
 return true;
}
