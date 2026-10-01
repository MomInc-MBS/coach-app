// Optional reflective ice tunnel; packaged with the ice board.
export const material=`float iH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 material(float a,float v,float z,float r,float aa,vec3 base){
 float facet=.5+.5*sin(a*7.+sin(v*.42)*2.);float reflection=pow(max(0.,sin(a*3.+v*.75)),32.);float crack=1.-smoothstep(.014,.045,abs(sin(a*9.+sin(v*.6))));
 vec2 id=vec2(mod(floor(a*3.183),20.),floor(v*.9));float h=iH(id);float shard=.55+.45*h;
 float glint=pow(max(0.,sin(v*2.4+h*6.2832)),20.)*step(.45,h)*aa;
 vec3 paletteColor=seq(floor(a*3.183)+floor(v*.9));
 vec3 iceColor=mix(base,paletteColor,facet*shard);
 return vec3(.15+.42*facet*shard)+iceColor*vec3(reflection*.7+crack*.25+glint*.9);
}`;
