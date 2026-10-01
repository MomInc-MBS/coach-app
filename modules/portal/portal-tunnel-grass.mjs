// Optional grimoire tunnel material; downloaded with its board. Blades and flower glints are cells in (a,v), so they stream past with travel.
export const material=`float gH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 material(float a,float v,float z,float r,float aa,vec3 base){
 float ca=a*9.549296586,cv=v*1.25;vec2 id=vec2(mod(floor(ca),60.),floor(cv)),q=vec2(fract(ca)-.5,fract(cv));
 float h=gH(id),n=gH(vec2(floor(a*38.2),floor(v*3.)));
 vec3 c=mix(seq(0.)*.52,seq(1.)*.82,n)+mix(seq(0.),seq(1.),.5)*.12*(.5+.5*sin(a*14.+v*.9));
 float lean=(h-.5)*.6,w=.2*(1.-q.y)+.015,blade=(1.-smoothstep(w*.6,w,abs(q.x-lean*q.y)))*step(.3,h)*aa;
 c=mix(c,mix(seq(0.),seq(1.)*1.18,q.y),blade);
 float f=gH(id+7.3),d=length((q-vec2(0.,.5))*vec2(1.,.8));
 float bloom=(1.-smoothstep(.07,.2,d))*step(.9,f)*aa,tw=.6+.4*sin(v*5.+f*40.);
 vec3 pet=f>.95?seq(3.):seq(2.);
 c=mix(c,pet*tw+base*.5,bloom)+pet*bloom*.35*tw;
 return c;
}`;
export const core='#7dff5a';
