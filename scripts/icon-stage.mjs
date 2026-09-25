import {unlink} from 'node:fs/promises';
import {join} from 'node:path';
export async function omitDuplicateCoachIcon(root){try{await unlink(join(root,'icons','coach-512.png'));}catch(error){if(error?.code!=='ENOENT')throw error;}}
