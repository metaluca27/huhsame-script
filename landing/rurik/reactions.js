// 던지기 반응 표. 반응을 추가하려면 여기에 한 줄만 넣으면 된다.
// frames: [받는 순간, 마무리] / weight: 합계 100 기준 확률 / sfx: 소리 끄기 설정을 따른다.
const REACTIONS=[
 {id:'eat',name:'냠냠',emoji:'😋',weight:19,frames:['eat-a','eat-b'],sfx:'sfx/eat.ogg',line:'맛없는 일이었네. 꿀꺽.',caption:'루릭이 오늘 이야기를 먹어 치움'},
 {id:'kick',name:'뻥',emoji:'🦶',weight:19,frames:['kick-a','kick-b'],sfx:'sfx/kick.ogg',line:'저 멀리 가라옹!',caption:'루릭이 오늘 이야기를 뻥 차 버림'},
 {id:'crumple',name:'구깃 휙',emoji:'🗑️',weight:19,frames:['crumple-a','crumple-b'],sfx:'sfx/crumple.ogg',line:'이런 건 쓰레기통 행.',caption:'루릭이 오늘 이야기를 구겨 버림'},
 {id:'ignore',name:'모른 척',emoji:'🙄',weight:19,frames:['ignore-a','ignore-b'],sfx:'sfx/boing.ogg',line:'…뭐. 들었어. 들었다고.',caption:'루릭이 못 들은 척 다 들음'},
 {id:'sit',name:'방석',emoji:'🍞',weight:19,frames:['sit-a','sit-b'],sfx:'sfx/plop.ogg',line:'이제 내 거야.',caption:'루릭이 오늘 이야기를 깔고 앉음'},
 {id:'headbutt',name:'박치기',emoji:'✨',weight:5,rare:true,frames:['headbutt-a','headbutt-b'],sfx:'tung-ding.wav',line:'오늘은 특별히 내가 막아 줌.',caption:'✨ 희귀 · 루릭이 머리로 막아 줌'}
];
const REACTION_READY='assets/reactions/ready.webp';
function reactionFrame(name){return `assets/reactions/${name}.webp`}
function findReaction(id){return REACTIONS.find(r=>r.id===id)||null}
// 직전 반응은 빼고 가중치대로 뽑는다.
function pickReaction(lastId,rand=Math.random){
 const pool=REACTIONS.filter(r=>r.id!==lastId);
 const total=pool.reduce((s,r)=>s+r.weight,0);
 let n=rand()*total;
 for(const r of pool){n-=r.weight;if(n<0)return r}
 return pool[pool.length-1];
}
// 첫 던지기가 늦지 않도록 반응 그림을 미리 받아 둔다(웹에서 특히 필요).
function preloadReactions(){[REACTION_READY,...REACTIONS.flatMap(r=>r.frames.map(reactionFrame))].forEach(src=>{const i=new Image();i.src=src})}
