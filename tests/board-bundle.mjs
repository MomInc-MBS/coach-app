// achievements-board.mjs imports battle-pass-rewards.mjs, which pulls a .ts file the browser can't parse; the app ships it
// bundled. Bundle it the same way for the stub-DOM board tests, leaving './battle-pass.mjs' to the test's own stub.
import {build} from 'esbuild';
export async function boardBundle(){
 const out=await build({entryPoints:['achievements-board.mjs'],bundle:true,write:false,format:'esm',target:'es2022',
  plugins:[{name:'stub-battle-pass',setup(b){b.onResolve({filter:/(^|\/)battle-pass\.mjs$/},()=>({path:'/battle-pass.mjs',external:true}));}}]});
 return out.outputFiles[0].text;
}
