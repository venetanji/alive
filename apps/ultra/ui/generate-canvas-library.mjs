import {writeFileSync} from 'node:fs';
import {LIBRARY_ENTRIES,createLibraryPatch} from './canvas-library.mjs';
import {utilityPatch,stereoLowpassPatch} from './canvas-effects.mjs';

const entries=LIBRARY_ENTRIES.map(entry=>({...entry,patch:createLibraryPatch(entry.key)}));
writeFileSync(new URL('./canvas-library-data.json',import.meta.url),JSON.stringify({entries},null,2)+'\n');
for(const [name,patch] of [['utility',utilityPatch()],['stereo-lowpass',stereoLowpassPatch()]])
  writeFileSync(new URL(`../examples/${name}.ultra`,import.meta.url),JSON.stringify(patch,null,2)+'\n');
console.log(`Generated ${entries.length} original help and example patches.`);
