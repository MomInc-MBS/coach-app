import {MOVEMENTS} from './movement-engine.mjs';
import {clockDigits} from './flip-display.mjs';
const groups=[['reps','Reps','reps'],['hold','Holds','held'],['steps','Steps','steps'],['jumps','Jumps','jumps'],['pace','Boxing','boxing']];
export function achievementBoards(items){
 const saved=new Map(items.map(item=>[item.mode,item]));
 return groups.map(([kind,title,unit])=>{
  const timed=kind==='hold'||kind==='pace';
  const rows=Object.entries(MOVEMENTS).filter(([,movement])=>movement.kind===kind).map(([mode,movement])=>{
   const item=saved.get(mode);
   return {mode,name:movement.name,sets:Number(item?.sets)||0,best:Number(item?.best)||0,total:Number(item?.total)||0};
  }).sort((a,b)=>b.best-a.best||a.mode.localeCompare(b.mode));
  let rank=0,previous=null;
  rows.forEach((row,index)=>{if(row.sets&&row.best!==previous)rank=index+1;row.rank=row.sets?rank:null;previous=row.best;});
  return {kind,title,unit,timed,rows,total:rows.reduce((sum,row)=>sum+row.total,0)};
 });
}
const number=value=>Math.floor(value).toLocaleString();
function totalLabel(board){
 if(!board.timed)return `${number(board.total)} ${board.unit} total`;
 const seconds=Math.floor(board.total),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);
 const duration=hours?`${hours}h ${minutes}m`:minutes?`${minutes}m ${seconds%60}s`:`${seconds}s`;
 return `${duration} ${board.unit} total`;
}
export function renderAchievements(container,items){
 container.replaceChildren();
 for(const board of achievementBoards(items)){
  const section=document.createElement('section');section.className='record-board';section.dataset.kind=board.kind;
  const heading=document.createElement('div');heading.className='record-heading';
  const title=document.createElement('h3');title.textContent=board.title;
  const total=document.createElement('span');total.textContent=totalLabel(board);heading.append(title,total);
  const table=document.createElement('table');table.setAttribute('aria-label',`${board.title} personal records`);
  const head=table.createTHead().insertRow();
  for(const label of ['Rank','Movement',board.timed?'Best set · m:ss':'Best set','Sets']){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);}
  const body=table.createTBody();
  for(const row of board.rows){
   const tr=body.insertRow();tr.dataset.record=String(row.sets>0);
   const rank=tr.insertCell();rank.className='record-rank';rank.textContent=row.rank?String(row.rank).padStart(2,'0'):'—';
   const name=document.createElement('th');name.scope='row';name.textContent=row.name;tr.append(name);
   const best=tr.insertCell();best.className='record-best';best.textContent=row.sets?(board.timed?clockDigits(row.best):number(row.best)):'—';
   tr.insertCell().textContent=number(row.sets);
  }
  section.append(heading,table);container.append(section);
 }
}
