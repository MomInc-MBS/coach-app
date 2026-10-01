// Optional grimoire tunnel material; downloaded with its board. Cracks pulse and embers stream past with travel.
export const material=`float wH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 material(float a,float v,float z,float r,float aa,vec3 base){
float bark=.5+.5*sin(a*28.+sin(v*.8)*2.);float crack=pow(1.-bark,16.);float ember=(.45+.55*sin(v*2.+a*3.))*crack;float ash=fract(sin(floor(a*150.)+floor(v*42.)*17.)*437.);
 float ca=a*9.549296586,cv=v*1.6;vec2 id=vec2(mod(floor(ca),60.),floor(cv)),q=vec2(fract(ca)-.5,fract(cv)-.5);float h=wH(id);
 float spark=(1.-smoothstep(.03,.11,length(q*vec2(1.,.6))))*step(.72,h)*(.5+.5*sin(v*6.+h*40.))*aa;
 vec3 woodBase=mix(seq(0.)*.05,seq(1.)*.32,bark);
 return woodBase*(.48+.52*ash)+base*ember*.9+mix(seq(2.),seq(3.),.5)*spark*1.4;
}`;
export const core='#fa5815';
