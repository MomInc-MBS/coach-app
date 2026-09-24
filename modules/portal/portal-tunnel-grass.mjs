// Optional grimoire tunnel material; downloaded with its board.
export const material=`vec3 material(float a,float v,float z,float r,float aa,vec3 base){
float soil=fract(sin(floor(a*160.)*14.31+floor(v*48.)*7.13)*437.1);float root=1.-smoothstep(.025,.09,abs(sin(a*11.+sin(v*.8)*1.7)));
 vec3 dirt=mix(vec3(.075,.032,.012),vec3(.28,.14,.045),soil)+vec3(.23,.12,.035)*root;
 vec2 bug=vec2(fract(a*3.183+sin(v*.4)*.12)-.5,fract(v*.24)-.5);float body=1.-smoothstep(.04,.085,length(bug*vec2(1.,1.8)));float legs=(1.-smoothstep(.015,.04,abs(bug.y+sin(bug.x*65.)*.027)))*(1.-smoothstep(.06,.12,abs(bug.x)));
 return mix(dirt,vec3(.014,.009,.004),max(body,legs)*aa);
}`;
export const core='#78512d';
