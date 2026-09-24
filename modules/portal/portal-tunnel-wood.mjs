// Optional grimoire tunnel material; downloaded with its board.
export const material=`vec3 material(float a,float v,float z,float r,float aa,vec3 base){
float bark=.5+.5*sin(a*28.+sin(v*.8)*2.);float crack=pow(1.-bark,16.);float ember=(.45+.55*sin(v*2.+a*3.))*crack;float ash=fract(sin(floor(a*150.)+floor(v*42.)*17.)*437.);
 return mix(vec3(.025,.02,.018),vec3(.16,.075,.027),bark)*(.48+.52*ash)+vec3(.95,.2,.018)*ember*.8;
}`;
export const core='#fa5815';
