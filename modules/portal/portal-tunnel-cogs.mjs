// Optional pipe-and-steam tunnel, downloaded with the mechanical door.
export const material=`vec3 material(float a,float v,float z,float r,float aa,vec3 base){
 float edge=abs(sin(a-.7)),pipe=1.-smoothstep(.085,.115,edge);float roundness=sqrt(max(0.,1.-pow(edge/.115,2.)));
 float joint=1.-smoothstep(.03,.09,abs(fract(v*.55)-.5));float steam=pow(max(0.,sin(a*5.+sin(v*1.2))*sin(v*.8+a)),4.);
 vec3 wall=vec3(.035,.044,.043)+vec3(.035,.043,.04)*pow(.5+.5*cos(a*12.),12.);
 vec3 metal=vec3(.28,.33,.32)*(.2+.8*roundness)+vec3(.13,.1,.065)*joint;
 return mix(wall,metal,pipe)+vec3(.34,.37,.36)*steam*.65;
}`;
export const core='#91aaa5';
