// Small procedural teaching figures. Coordinates are metres, y points up.
export function demoPose(mode,t=0){
 const p={head:[0,.85,0],neck:[0,.65,0],ls:[-.23,.57,0],rs:[.23,.57,0],le:[-.31,.18,0],re:[.31,.18,0],lw:[-.3,-.13,0],rw:[.3,-.13,0],lh:[-.15,0,0],rh:[.15,0,0],lk:[-.17,-.46,0],rk:[.17,-.46,0],la:[-.17,-.95,0],ra:[.17,-.95,0]};
 const wave=Math.sin(t*4),rise=Math.max(0,Math.sin(t*3.6));
 if(mode==='tree'){p.lk=[-.52,-.2,0];p.la=[.12,-.38,0];p.le=[-.3,.32,0];p.re=[.3,.32,0];p.lw=[-.025,.48,.08];p.rw=[.025,.48,.08];}
 if(mode==='warrior'){p.lk=[-.65,-.4,0];p.la=[-.65,-.95,0];p.rk=[.46,-.43,0];p.ra=[.82,-.95,0];p.le=[-.58,.57,0];p.re=[.58,.57,0];p.lw=[-.94,.57,0];p.rw=[.94,.57,0];}
 if(mode==='horse'){p.lk=[-.53,-.25,0];p.rk=[.53,-.25,0];p.la=[-.53,-.79,0];p.ra=[.53,-.79,0];p.le=[-.3,.24,.05];p.re=[.3,.24,.05];p.lw=[-.03,.42,.15];p.rw=[.03,.42,.15];for(const v of Object.values(p))v[1]-=.15;}
 if(mode==='boxing'){for(const [side,sign,phase] of [['l',-1,wave],['r',1,-wave]]){const punch=Math.max(0,phase);p[side+'e']=[sign*.28,.37+punch*.16,.2+punch*.22];p[side+'w']=[sign*.2,.55,.25+punch*.65];}p.la=[-.32,-.95,.1];p.ra=[.32,-.95,-.17];}
 if(mode==='jogging'){for(const [side,sign,phase] of [['l',-1,wave],['r',1,-wave]]){const lift=Math.max(0,phase);p[side+'k']=[sign*.17,-.46+lift*.4,lift*.36];p[side+'a']=[sign*.17,-.95+lift*.42,.06];p[side+'e']=[sign*.32,.22,-phase*.18];p[side+'w']=[sign*.27,.42,-phase*.32];}for(const v of Object.values(p))v[1]+=.035*Math.abs(wave);}
 if(mode==='jumping'){for(const v of Object.values(p))v[1]+=.3*rise;p.le[0]-=.1*rise;p.re[0]+=.1*rise;p.lw[1]+=.45*rise;p.rw[1]+=.45*rise;}
 return p;
}
export const DEMO_BONES=[['head','neck'],['ls','rs'],['neck','lh'],['neck','rh'],['lh','rh'],['ls','le'],['le','lw'],['rs','re'],['re','rw'],['lh','lk'],['lk','la'],['rh','rk'],['rk','ra']];
