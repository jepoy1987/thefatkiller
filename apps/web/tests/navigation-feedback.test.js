import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost/dashboard'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import('react');const runtime=await import('react/jsx-runtime');const {createRoot}=await import('react-dom/client');
let finish;const navigations=[];
const context={exports:{},require:n=>({'react':React,'react/jsx-runtime':runtime,'next/link':{default:props=>React.createElement('a',props)},'next/navigation':{usePathname:()=>'/dashboard',useRouter:()=>({push:href=>{navigations.push(href);return new Promise(r=>{finish=r;});}})}}[n])};
vm.runInNewContext(ts.transpileModule(await readFile(new URL('../components/layout/navigation-feedback.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
const {NavigationFeedback,NavigationLink}=context.exports;
test('navigation visibly responds before destination resolves and clears on completion',async()=>{
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
 await React.act(async()=>root.render(React.createElement(NavigationFeedback,null,React.createElement(NavigationLink,{href:'/nutrition'},'Nutrition'))));
 const started=performance.now();React.act(()=>container.querySelector('a').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,button:0})));
 assert.equal(container.querySelector('[role=status]').textContent,'Loading page…');assert.ok(performance.now()-started<150);assert.deepEqual(navigations,['/nutrition']);
 await React.act(async()=>finish());assert.equal(container.querySelector('[role=status]'),null);
 await React.act(async()=>root.unmount());container.remove();
});
test('modified click preserves native navigation and does not show pending state',async()=>{
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);navigations.length=0;
 await React.act(async()=>root.render(React.createElement(NavigationFeedback,null,React.createElement(NavigationLink,{href:'/nutrition',target:'_blank'},'Nutrition'))));
 React.act(()=>container.querySelector('a').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,button:0,ctrlKey:true})));
 assert.equal(container.querySelector('[role=status]'),null);assert.equal(navigations.length,0);await React.act(async()=>root.unmount());container.remove();
});
