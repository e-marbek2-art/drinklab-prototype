import {readFile,mkdir,writeFile} from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8');
const ids=async file=>[...(await readFile(file,'utf8')).matchAll(/\bid:'([a-z0-9-]+)'/g)].map(m=>m[1]);
const paths=['about','ingredients',...(await ids('src/data.ts')).map(id=>`drinks/${id}`),...(await ids('src/ingredients.ts')).map(id=>`ingredients/${id}`)];
for(const path of paths){await mkdir(`dist/${path}`,{recursive:true});await writeFile(`dist/${path}/index.html`,html);}
await writeFile('dist/.nojekyll','');
await writeFile('dist/404.html',html);
console.log(`Created ${paths.length} direct page entry points for static hosting.`);
