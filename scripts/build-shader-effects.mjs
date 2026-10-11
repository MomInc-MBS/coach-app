// Rebuild the locally served MIT runtime; no account or runtime CDN is required.
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const search=process.env.SHADER_BUILD_NODE_PATH ? [process.env.SHADER_BUILD_NODE_PATH] : [];
const core=require.resolve('shaders/core',{paths:[resolve('.'),...search]});
const root=resolve(dirname(core),'../..');
const entry=resolve(root,'dist/js/index.js');
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if(pkg.version!=='4.0.4')throw Error('Expected the reviewed shaders4.0.4 runtime.');
const {outputFiles:[output]}=await build({stdin:{contents:`export {createShader} from ${JSON.stringify(entry)};`,resolveDir:root},bundle:true,format:'esm',target:'es2022',minify:true,write:false,legalComments:'eof'});
await mkdir('vendor/shaders',{recursive:true});
await writeFile('vendor/shaders/runtime.mjs',output.contents);
await writeFile('vendor/shaders/LICENSE',await readFile(resolve(root,'LICENSE')));
await writeFile('vendor/shaders/version.json',JSON.stringify({package:'shaders',version:pkg.version,license:pkg.license,source:'https://github.com/shader-effects-inc/shaders',sha256:createHash('sha256').update(output.contents).digest('hex')}));
