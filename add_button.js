const fs = require('fs');
const file = 'app/coach/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /                                  <\/div>\r?\n                                \}\)\}\r?\n                             <\/div>\r?\n                          <\/div>/,
  `                                  </div>
                                ))}
                                <button onClick={() => addExercise(model, meso.id, micro.id)} className="w-full py-2 mt-2 border border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-white hover:border-slate-600 transition-colors flex items-center justify-center gap-2 group"><Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase italic tracking-widest">Adicionar Exercício</span></button>
                             </div>
                          </div>`
);
fs.writeFileSync(file, content, 'utf8');
