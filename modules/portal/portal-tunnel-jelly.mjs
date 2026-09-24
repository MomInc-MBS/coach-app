// Optional grimoire tunnel material; downloaded with its board.
export const material=`vec3 material(float a,float v,float z,float r,float aa,vec3 base){
float bump=pow(max(0.,sin(a*8.+sin(v))*sin(v*3.)),3.);float shine=pow(max(0.,sin(a*8.+.4)*sin(v*3.+.5)),18.);
 return uTint*(.22+.5*bump)+vec3(.06+.22*shine);
}`;
