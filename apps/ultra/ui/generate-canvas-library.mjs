import {writeFileSync} from 'node:fs';
import {LIBRARY_ENTRIES,createLibraryPatch} from './canvas-library.mjs';

const entries=LIBRARY_ENTRIES.map(entry=>({...entry,patch:createLibraryPatch(entry.key)}));
writeFileSync(new URL('./canvas-library-data.json',import.meta.url),JSON.stringify({entries},null,2)+'\n');
console.log(`Generated ${entries.length} original help and example patches.`);
