// Optional grimoire tunnel material; downloaded with its board. A murky water well: rippling rings, silt drifting
// down the walls, lily pads floating past and koi shadows sliding through the green.
export const material=`float pH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 material(float a,float v,float z,float r,float aa,vec3 base){
 float rip=.5+.5*sin(v*6.2832+sin(a*4.+v)*1.4),silt=pH(vec2(floor(a*40.),floor(v*6.)));
 vec3 c=mix(seq(0.)*.18,seq(1.)*.5,rip*.7+silt*.3);
 c+=seq(2.)*.25*pow(max(0.,sin(a*5.-v*2.3)),8.)*aa;
 float ca=a*4.774648,cv=v*.9;vec2 id=vec2(mod(floor(ca),30.),floor(cv)),q=vec2(fract(ca)-.5,fract(cv)-.5);float h=pH(id);
 float pad=(1.-smoothstep(.22,.27,length(q)))*step(.62,h)*step(.12,abs(atan(q.y,q.x)-h*6.))*aa;
 c=mix(c,seq(3.)*(.55+.3*h),pad);
 float koi=(1.-smoothstep(.1,.5,length(vec2(fract(a*.477+v*.11)-.5,(fract(v*.35)-.5)*3.))))*.6;
 return mix(c,c*.25,koi)+base*.12;
}`;
export const core='#5fd3b8';
