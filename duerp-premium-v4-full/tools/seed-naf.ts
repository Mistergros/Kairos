import fs from 'fs'; import path from 'path';
function parseCSV(text: string){
  const lines = text.split(/\r?\n/).filter(Boolean); const header = lines.shift()!.split(',');
  return lines.map(line => {
    const cols = []; let cur=''; let inside=false;
    for (let i=0;i<line.length;i++){ const c=line[i];
      if (c==='"'){ inside=!inside; continue; }
      if (c===',' && !inside){ cols.push(cur); cur=''; } else { cur+=c; }
    } cols.push(cur);
    const obj:any = {}; header.forEach((h,idx)=> obj[h.trim()] = (cols[idx]||'').trim());
    const splitPipe = (v:string)=> v? v.split('|').map(s=>s.trim()).filter(Boolean): [];
    return { naf: obj.naf, label: obj.label, risks_priority: splitPipe(obj.risks_priority),
      risks_mandatory: splitPipe(obj.risks_mandatory), actions_recommended: splitPipe(obj.actions_recommended),
      legal_specific: splitPipe(obj.legal_specific) };
  });
}
const [,,csvPath,outDir] = process.argv;
if (!csvPath || !outDir){ console.error('Usage: ts-node tools/seed-naf.ts ./data/naf.csv ./config/naf'); process.exit(1); }
const rows = parseCSV(fs.readFileSync(csvPath,'utf-8'));
fs.mkdirSync(outDir,{recursive:true});
rows.forEach(r=>{ const slug = `${r.naf}-${(r.label||'').toLowerCase().replace(/[^a-z0-9]+/g,'_')}.json`; fs.writeFileSync(path.join(outDir, slug), JSON.stringify(r,null,2), 'utf-8'); console.log('Wrote', slug); });
