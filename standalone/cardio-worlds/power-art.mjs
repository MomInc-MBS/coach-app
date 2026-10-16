// Distinct silhouettes, not interchangeable diamonds. Geometry resources belong to the caller.
export function powerModel(T,id,{mesh,box,cylinder,sphere},parent){
  const gold=0xffd269,teal=0x84ead9,violet=0xc39afa,red=0xdb7988;
  const ring=(r,t,c,x=0,y=0,z=0)=>mesh(new T.TorusGeometry(r,t,7,20),c,x,y,z,parent,'gold');
  if(id==='magnet'){
    const u=mesh(new T.TorusGeometry(.34,.12,7,18,Math.PI),red,0,0,0,parent,'metal');u.rotation.z=Math.PI;
    for(const s of [-1,1])box(s*.34,.17,0,.24,.32,.24,teal,parent,'metal');
  }else if(id==='shield'||id==='recovery'){
    const shield=mesh(new T.IcosahedronGeometry(.46,1),id==='shield'?violet:gold,0,0,0,parent,'gold');shield.scale.set(.85,1.15,.3);
    box(0,0,.17,.09,.56,.08,teal,parent,'gold');box(0,0,.17,.4,.08,.08,teal,parent,'gold');
    if(id==='recovery')for(const s of [-1,1])for(let k=0;k<3;k++){const feather=box(s*(.38+k*.12),.12-k*.12,0,.35,.12,.1,gold,parent,'gold');feather.rotation.z=s*.4;}
  }else if(id==='jetpack'){
    for(const s of [-1,1]){cylinder(s*.25,0,0,.19,.75,teal,parent,'metal');mesh(new T.ConeGeometry(.17,.4,8),gold,s*.25,-.5,0,parent,'gold').rotation.z=Math.PI;}
    box(0,0,0,.27,.5,.35,violet,parent,'metal');
  }else if(id==='board'){
    const b=box(0,0,0,1,.12,.32,teal,parent,'metal');b.rotation.z=.2;for(const s of [-1,1])ring(.12,.05,gold,s*.32,-.1);
  }else if(id==='superJump'){
    for(const s of [-1,1]){box(s*.25,-.12,.12,.3,.2,.55,gold,parent,'rubber');box(s*.25,.08,0,.25,.35,.25,violet,parent,'metal');}
  }else if(id==='phase'){ring(.4,.07,violet);ring(.28,.06,teal);sphere(0,0,0,.15,violet,parent);}
  else if(id==='pogo'){cylinder(0,0,0,.07,.9,violet,parent,'metal');box(0,.4,0,.5,.08,.1,teal,parent,'metal');ring(.14,.04,gold,0,-.25).rotation.x=Math.PI/2;box(0,-.15,0,.42,.06,.15,gold,parent,'metal');}
  else if(id==='doubleCoins'||id==='coinTier'){for(let i=0;i<(id==='coinTier'?3:2);i++){const c=cylinder((i-1)*.23,0,i*.06,.3,.07,gold,parent,'gold');c.rotation.x=Math.PI/2;}}
  else if(id==='scoreBoost'){const star=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.2:.47;const x=Math.sin(a)*r,y=Math.cos(a)*r;if(i)star.lineTo(x,y);else star.moveTo(x,y);}star.closePath();mesh(new T.ExtrudeGeometry(star,{depth:.1,bevelEnabled:false}),gold,0,0,0,parent,'gold');}
  else {for(let i=0;i<3;i++){const arrow=mesh(new T.ConeGeometry(.2,.4,4),i%2?gold:violet,0,(i-1)*.25,0,parent,'metal');arrow.rotation.x=Math.PI/2;}}
}
