// Optional grimoire tunnel material; downloaded with its board. The wall wobbles and bulges as it flows.
export const material=`vec3 material(float a,float v,float z,float r,float aa,vec3 base){
 float w=.5*sin(a*6.+v*2.)+.5*sin(a*3.-v*1.3+1.);float bulge=pow(.5+.5*w,2.);
 float bump=pow(max(0.,sin(a*8.+sin(v))*sin(v*3.)),3.);float shine=pow(max(0.,sin(a*8.+.4+w)*sin(v*3.+.5+w)),18.);
 float rim=pow(1.-abs(w),5.);
 vec3 pal=seq(floor(a*1.273)+floor(v*.5));
 vec3 jellyCol=mix(pal, pal*1.2, bulge);
 return (.18+.35*bulge+.3*bump)*jellyCol+vec3(rim*.25)+vec3(.06+.3*shine)*aa;
}`;
