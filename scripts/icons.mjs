import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
await mkdir('icons',{recursive:true});
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="108" fill="#21172f"/><rect x="92" y="72" width="328" height="368" rx="62" fill="#382447" stroke="#d9a756" stroke-width="12"/><text x="256" y="238" text-anchor="middle" fill="#f8dda9" font-family="Arial,sans-serif" font-weight="bold" font-size="82">MYR5</text><text x="256" y="316" text-anchor="middle" fill="#e5cdec" font-family="Arial,sans-serif" font-weight="bold" font-size="42" letter-spacing="5">COACH</text><path d="M176 367h160" stroke="#eea954" stroke-width="12" stroke-linecap="round"/></svg>');
for(const size of [192,512])await sharp(svg).resize(size,size).png().toFile(`icons/coach-${size}.png`);
