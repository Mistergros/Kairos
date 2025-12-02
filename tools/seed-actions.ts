import fs from 'fs'; import path from 'path';
const [,,riskId,jsonPath,outDir] = process.argv;
if (!riskId || !jsonPath || !outDir){ console.error('Usage: ts-node tools/seed-actions.ts R-GLISSADES ./data/actions.json ./config/actions'); process.exit(1); }
const arr = JSON.parse(fs.readFileSync(jsonPath,'utf-8'));
const withIds = arr.map((a:any,idx:number)=> ({ id:`A-${riskId}-${String(idx+1).padStart(3,'0')}`, risk_id:riskId, ...a }));
fs.mkdirSync(outDir,{recursive:true});
const out = path.join(outDir, `${riskId}.actions.json`);
fs.writeFileSync(out, JSON.stringify(withIds,null,2), 'utf-8');
console.log('Wrote', out);
