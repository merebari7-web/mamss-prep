/* Contain legacy learning tools without letting their historical theme restyle the workspace. */
const fs=require('fs'),postcss=require('postcss'),selectors=require('postcss-selector-parser');
const tree=postcss.parse(fs.readFileSync('ui/legacy-source.css','utf8'));
tree.walkRules(rule=>{
 let parent=rule.parent;
 while(parent){if(parent.type==='atrule'&&(/keyframes/i.test(parent.name)||parent.params==='print'))return;parent=parent.parent;}
 const output=[];
 selectors().astSync(rule.selector).each(sel=>{
  const raw=sel.toString();
  if(/^(?:html|body|:root)(?:\[[^\]]*\]|\.[\w-]+)*$/.test(raw)){
   const vars=rule.nodes.filter(n=>n.type==='decl'&&n.prop.startsWith('--'));
   if(vars.length){const condition=/^html|^body/.test(raw)?raw:'';const r=postcss.rule({selector:(condition&&condition!=='html'&&condition!=='body'?condition+' ':'')+'.legacy-ui'});vars.forEach(n=>r.append(n.clone()));rule.before(r);}
   return;
  }
  if(/^(?:body|html)(?:::?(?:before|after))/.test(raw))return;
  if(raw.includes('#printSheet')){output.push(raw);return;}
  output.push(':where(.legacy-ui):is('+raw+'),:where(.legacy-ui) :is('+raw+')');
 });
 if(output.length)rule.selector=output.join(',');else rule.remove();
});
fs.writeFileSync('ui/legacy.css',tree.toString());
