(function(){
  const cfg=window.AMONA_CMS||{};
  if(!cfg.supabaseUrl||!cfg.anonKey||!window.supabase)return;
  const db=window.supabase.createClient(cfg.supabaseUrl,cfg.anonKey);
  const safeType=t=>['new','repeat','all'].includes(t)?t:'all';
  const typeLabel={new:'新規',repeat:'再来',all:'全員'};

  async function loadImages(){
    const nodes=[...document.querySelectorAll('[data-cms-image]')];
    if(!nodes.length)return;
    const {data,error}=await db.from('site_images').select('slot,url,alt_text');
    if(error||!data)return;
    const map=Object.fromEntries(data.map(x=>[x.slot,x]));
    nodes.forEach(img=>{const item=map[img.dataset.cmsImage];if(item&&item.url){img.src=item.url;if(item.alt_text)img.alt=item.alt_text}});
  }

  function couponCard(item){
    const type=safeType(item.customer_type),article=document.createElement('article');
    article.className='coupon-card';article.dataset.type=type;
    const badge=document.createElement('span');badge.className='type '+type;badge.textContent=typeLabel[type];article.appendChild(badge);
    if(item.tag){const tag=document.createElement('span');tag.className='tag';tag.textContent=item.tag;article.appendChild(tag)}
    const title=document.createElement('h2');title.textContent=item.title;article.appendChild(title);
    const price=document.createElement('strong');price.textContent=item.price;article.appendChild(price);
    const desc=document.createElement('p');desc.textContent=item.description||'';article.appendChild(desc);
    const actions=document.createElement('div'),consult=document.createElement('a');consult.href='reservation.html';consult.textContent='LINEで相談';actions.appendChild(consult);
    const reserve=document.createElement('a'),target=item.reserve_url||'reservation.html';reserve.className='reserve';reserve.href=target;reserve.textContent='このクーポンで予約';if(/^https?:/i.test(target)){reserve.target='_blank';reserve.rel='noopener nofollow'}actions.appendChild(reserve);article.appendChild(actions);
    return article;
  }

  async function loadCoupons(){
    const grid=document.querySelector('.coupon-grid');if(!grid)return;
    const {data,error}=await db.from('coupons').select('*').eq('is_active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error||!data||!data.length)return;
    grid.replaceChildren(...data.map(couponCard));
  }

  loadImages().catch(()=>{});loadCoupons().catch(()=>{});
})();
