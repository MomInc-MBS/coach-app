// Optional reflective ice tunnel; packaged with the ice board.
export const material=`vec3 material(float a,float v,float z,float r,float aa,vec3 base){
 float facet=.5+.5*sin(a*7.+sin(v*.42)*2.);float reflection=pow(max(0.,sin(a*3.+v*.75)),32.);float crack=1.-smoothstep(.014,.045,abs(sin(a*9.+sin(v*.6))));
 return uTint*(.19+.42*facet)+vec3(reflection*.7+crack*.2);
}`;
