import AdminPanel from './AdminPanel'
import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, Edit3, ExternalLink, Lock, LogOut, Menu, MessageCircle, MessageSquare, Plus, Radio, Search, Send, ShieldCheck, Star, Trash2, UserCircle, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { configured, errorMessage, examples, supabase, type Feedback, type Mod } from './lib'
import './style.css'

type AuthMode = 'login' | 'signup'
const date = (s: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(s))
function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [mods, setMods] = useState<Mod[]>(examples)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('recent')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dbError, setDbError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [kind,setKind] = useState('review')

  const refreshMods = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('mods').select('*').order('created_at', { ascending: false })
    if (error) setDbError(error.message)
    else { setMods(data || []); setDbError('') }
  }
  const refreshFeedback = async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    if (error) setDbError(error.message)
    else { setFeedbacks(data || []); setDbError('') }
  }
  useEffect(() => {
    const client = supabase
    if (!client) return
    client.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    void refreshMods(); void refreshFeedback()
    const realtime = client.channel('frontier-public-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => { void refreshFeedback() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mods' }, () => { void refreshMods() })
      .subscribe()
    return () => { listener.subscription.unsubscribe(); void client.removeChannel(realtime) }
  }, [])
  useEffect(() => {
    if (!supabase || !user) { setAdmin(false); setAdminOpen(false); return }
    supabase.rpc('is_admin').then(({data,error})=>setAdmin(!error && data === true))
  },[user])
  const current = selected ? mods.find(m => m.id === selected) : null
  const commentsFor = (modId: string) => feedbacks.filter(f => f.mod_id === modId)
  const filtered = useMemo(() => mods.filter(m => `${m.title} ${m.description} ${m.category}`.toLowerCase().includes(filter.toLowerCase())), [mods, filter])
  const visibleComments = useMemo(() => {
    const list = feedbacks.filter(f => f.mod_id === selected)
    if (sort === 'highest') list.sort((a,b) => b.rating - a.rating)
    else if (sort === 'lowest') list.sort((a,b) => a.rating - b.rating)
    else list.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return list
  }, [feedbacks, selected, sort])
  const average = (modId: string) => { const c = commentsFor(modId); return c.length ? (c.reduce((s,f)=> s + f.rating, 0) / c.length).toFixed(1) : '—' }
  const openReview = (f?: Feedback) => {
    if (!user) { setAuthOpen(true); setAuthMode('login'); return }
    setEditId(f?.id ?? null); setRating(f?.rating ?? 5); setContent(f?.content ?? ''); setKind(f?.kind ?? 'review'); setReviewOpen(true); setMessage('')
  }
  const saveFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !user || !current || !content.trim() || saving) return
    setSaving(true); setMessage('')
    const response = editId
      ? await supabase.from('feedback').update({ content: content.trim(), rating, kind }).eq('id', editId).eq('user_id', user.id)
      : await supabase.from('feedback').insert({ mod_id: current.id, user_id: user.id, author_name: String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Usuário').slice(0, 40), rating, content: content.trim(), kind })
    setSaving(false)
    if (response.error) { setMessage(errorMessage(response.error)); return }
    setReviewOpen(false); setEditId(null); setContent(''); await refreshFeedback()
  }
  const deleteFeedback = async (f: Feedback) => {
    if (!supabase || !user || f.user_id !== user.id || !window.confirm('Apagar seu feedback permanentemente?')) return
    const { error } = await supabase.from('feedback').delete().eq('id', f.id).eq('user_id', user.id)
    if (error) setMessage(errorMessage(error)); else { setMessage('Feedback excluído.'); void refreshFeedback() }
  }
  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setAuthBusy(true); setAuthMessage('')
    const { error, data } = authMode === 'signup'
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { display_name: authName.trim().slice(0,40) } } })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
    setAuthBusy(false)
    if (error) { setAuthMessage(errorMessage(error)); return }
    if (data.session) { setAuthOpen(false); setAuthPassword(''); setAuthMessage('') }
    else setAuthMessage('Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre.')
  }
  const logout = async () => { await supabase?.auth.signOut(); setReviewOpen(false) }
  const stars = (n: number, size=14) => <span className="stars" aria-label={`${n} de 5 estrelas`}>{[1,2,3,4,5].map(i=><Star key={i} size={size} fill={i <= Math.round(n) ? 'currentColor' : 'none'} className={i <= Math.round(n) ? 'star-on' : 'star-off'} />)}</span>
  return <div className="site">
    <header className="topbar"><div className="shell nav"><button className="brand" onClick={() => { setSelected(null); setMenuOpen(false) }} aria-label="Página inicial"><span className="brand-mark">F<span>.</span></span><span className="brand-name">FRONTIER<span>FEEDBACK</span><small>THE MODDING COMMUNITY</small></span></button>
      <nav className={menuOpen ? 'nav-links open' : 'nav-links'}><button onClick={() => { setSelected(null); setMenuOpen(false) }}>INÍCIO</button><button onClick={() => { setSelected(null); setMenuOpen(false); document.getElementById('mods')?.scrollIntoView({ behavior: 'smooth' }) }}>EXPLORAR MODS</button><a href="https://www.nexusmods.com/reddeadredemption2" target="_blank" rel="noopener noreferrer">NEXUS MODS <ExternalLink size={12}/></a></nav>
      <div className="nav-actions"><div className="status"><i/> <span>COMUNIDADE AO VIVO</span></div>{user ? <div className="account">{admin && <button className="admin-nav-btn" onClick={()=>{setAdminOpen(!adminOpen);setSelected(null)}}>{adminOpen?'VER SITE':'PAINEL ADMIN'}</button>}<span><UserCircle size={18}/> {String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Conta')}</span><button className="logout" onClick={logout} title="Sair"><LogOut size={17}/></button></div> : <button className="btn btn-outline nav-login" onClick={() => {setAuthMode('login');setAuthOpen(true)}}><UserCircle size={17}/> ENTRAR</button>}<button className="mobile-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><Menu/></button></div>
    </div></header>
    {admin && adminOpen ? <AdminPanel mods={mods} feedbacks={feedbacks} onClose={()=>setAdminOpen(false)} onRefresh={async()=>{await refreshMods();await refreshFeedback()}}/> : !current ? <>
      <section className="hero"><div className="hero-scenery"/><div className="hero-grain"/><div className="shell hero-inner"><div className="eyebrow"><span className="eyebrow-line"/> RED DEAD REDEMPTION 2 · MODDING COMMUNITY</div><h1>YOUR VOICE.<br/><em>OUR FRONTIER.</em></h1><p>Seus comentários moldam nossos próximos mods. Explore os projetos, compartilhe suas ideias e ajude a construir experiências melhores no Velho Oeste.</p><div className="hero-buttons"><button className="btn btn-red" onClick={()=>document.getElementById('mods')?.scrollIntoView({behavior:'smooth'})}>EXPLORAR MODS <ArrowRight size={18}/></button><button className="btn btn-ghost" onClick={()=>document.getElementById('how')?.scrollIntoView({behavior:'smooth'})}>COMO FUNCIONA <ArrowDown size={18}/></button></div><div className="hero-stats"><div><strong>{mods.length.toString().padStart(2,'0')}</strong><span>MODS PUBLICADOS</span></div><div><strong>{feedbacks.length.toString().padStart(2,'0')}</strong><span>FEEDBACKS</span></div><div><strong>24/7</strong><span>ATUALIZAÇÃO AO VIVO</span></div></div></div><div className="hero-side-label">EST. 1899 · BUILT BY THE COMMUNITY</div></section>
      <main><section id="mods" className="mods-section shell"><div className="section-top"><div><div className="kicker">// EXPLORE THE COLLECTION</div><h2>THE <span>MODS.</span></h2><p>Escolha um projeto, avalie sua experiência e conte o que pode melhorar.</p></div><div className="searchbox"><Search size={19}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Pesquisar mods..." aria-label="Pesquisar mods"/></div></div>
      {!configured && <div className="setup-banner"><Lock size={19}/><div><strong>Prévia de demonstração.</strong> Os cards estão disponíveis para visualizar o design. Para habilitar login, comentários e tempo real, configure o Supabase seguindo o README.</div></div>}
      {dbError && <div className="setup-banner">Não foi possível carregar os dados: {dbError}</div>}
      <div className="mod-grid">{filtered.map((m,i)=><article key={m.id} className="mod-card"><div className={`mod-cover mod-cover-${i%3}`} style={m.cover_url?{backgroundImage:`linear-gradient(180deg, transparent, rgba(0,0,0,.77)), url("${m.cover_url.replace(/"/g, '')}")`}:undefined}><span className="mod-number">{String(i+1).padStart(2,'0')} / {String(mods.length).padStart(2,'0')}</span><span className="cover-art">{m.title.split(' ').slice(0,2).map(w=>w[0]).join('')}</span><span className="mod-type">{m.category}</span></div><div className="mod-body"><div className="mod-version"><span className="version-dot"/> {m.version}</div><h3>{m.title}</h3><p>{m.description}</p><div className="mod-rating">{stars(Number(average(m.id))||0)} <b>{average(m.id)}</b><span>({commentsFor(m.id).length} avaliações)</span></div><button className="mod-open" onClick={()=>{setSelected(m.id);window.scrollTo(0,0);setMessage('')}}>VER FEEDBACKS <ArrowRight size={19}/></button></div></article>)}</div>
      {filtered.length===0 && <div className="empty"><Search/><p>Nenhum mod encontrado. Tente outra pesquisa.</p></div>}</section>
      <section id="how" className="how-section"><div className="shell"><div className="kicker">// THE PROCESS</div><h2>MAKE YOUR <span>MARK.</span></h2><div className="how-grid"><div><span>01</span><MessageSquare size={28}/><h3>ESCOLHA UM MOD</h3><p>Explore os projetos disponíveis e encontre aquele que você utiliza.</p></div><div><span>02</span><Star size={28}/><h3>COMPARTILHE SUA OPINIÃO</h3><p>Avalie de 1 a 5 estrelas e escreva sugestões, elogios ou relatórios de bugs.</p></div><div><span>03</span><Radio size={28}/><h3>ACOMPANHE AO VIVO</h3><p>Novos comentários aparecem automaticamente. Você pode editar ou apagar os seus.</p></div></div></div></section></main>
    </> : <main className="detail shell"><button className="back" onClick={()=>{setSelected(null);setReviewOpen(false);window.scrollTo(0,0)}}><ArrowLeft size={18}/> VOLTAR AOS MODS</button><div className="detail-head"><div><div className="kicker">// MOD COMMUNITY · {current.category}</div><h1>{current.title}<span>.</span></h1><p>{current.description}</p><div className="detail-meta"><span className="tag">{current.version}</span><span>{stars(Number(average(current.id))||0)} <b>{average(current.id)}</b></span><span><MessageCircle size={16}/> {visibleComments.length} avaliações</span></div>{current.nexus_url && <a className="nexuslink" href={current.nexus_url} target="_blank" rel="noopener noreferrer">VER NA NEXUS MODS <ExternalLink size={16}/></a>}</div><div className="detail-emblem">{current.title.split(' ').slice(0,2).map(w=>w[0]).join('')}</div></div>
      <div className="reviews-header"><div><div className="kicker">// COMMUNITY VOICES</div><h2>FEEDBACKS <span>({visibleComments.length})</span></h2><div className="live-line"><i/> Comentários sincronizados em tempo real</div></div><button className="btn btn-red" onClick={()=>openReview()}><Plus size={17}/> ESCREVER FEEDBACK</button></div>
      {message && !reviewOpen && <div className="inline-message">{message}</div>}
      <div className="reviews-layout"><div className="review-list"><div className="sortbar"><span>AVALIAÇÕES DA COMUNIDADE</span><label>ORDENAR POR <select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Mais recentes</option><option value="highest">Maior nota</option><option value="lowest">Menor nota</option></select><ChevronDown size={13}/></label></div>
      {visibleComments.map(f=><article className="review" key={f.id}><div className="review-avatar">{f.author_name[0]?.toUpperCase() || '?'}</div><div className="review-content"><div className="review-top"><div><strong>{f.author_name}</strong> {f.user_id===user?.id && <span className="you">VOCÊ</span>}<div className="review-stars">{stars(f.rating,15)}</div></div><time><Clock3 size={13}/> {date(f.created_at)}</time></div><p>{f.content}</p>{f.is_featured && <div className="featured">★ SUGESTÃO EM DESTAQUE</div>}{f.admin_reply && <div className="developer-reply"><strong>RESPOSTA DO DESENVOLVEDOR</strong><p>{f.admin_reply}</p></div>}<div className="review-bottom"><span>{f.updated_at !== f.created_at ? 'Editado' : 'Feedback da comunidade'}</span>{f.user_id === user?.id && <div><button onClick={()=>openReview(f)}><Edit3 size={14}/> Editar</button><button className="delete" onClick={()=>void deleteFeedback(f)}><Trash2 size={14}/> Excluir</button></div>}</div></div></article>)}
      {!visibleComments.length && <div className="empty reviews-empty"><MessageCircle size={36}/><h3>AINDA ESTÁ SILENCIOSO POR AQUI.</h3><p>Seja a primeira pessoa a compartilhar sua opinião sobre este mod.</p><button className="btn btn-outline" onClick={()=>openReview()}>DEIXAR PRIMEIRA AVALIAÇÃO <ArrowRight size={15}/></button></div>}
      </div><aside className="review-aside"><div className="score-card"><div className="kicker">// COMMUNITY RATING</div><div className="score">{average(current.id)}<span>/ 5.0</span></div>{stars(Number(average(current.id))||0,20)}<p>Baseado em {visibleComments.length} avaliações</p><div className="score-bars">{[5,4,3,2,1].map(n=><div key={n}><span>{n} <Star size={11} fill="currentColor"/></span><div><i style={{width:`${visibleComments.length ? visibleComments.filter(f=>f.rating===n).length / visibleComments.length *100 : 0}%`}}/></div><small>{visibleComments.filter(f=>f.rating===n).length}</small></div>)}</div></div><div className="aside-tip"><ShieldCheck size={23}/><strong>AVALIAÇÕES AUTÊNTICAS</strong><p>Cada avaliação pertence à conta que a publicou. Somente seu autor pode alterá-la ou excluí-la.</p></div></aside></div></main>}
    <footer><div className="shell footer-content"><div className="footer-logo">FRONTIER<span>FEEDBACK</span><small>BUILT FOR MODDERS, BY MODDERS.</small></div><p>Projeto independente da comunidade. Não afiliado à Rockstar Games ou à Take-Two Interactive.</p><a href="https://www.nexusmods.com/reddeadredemption2" target="_blank" rel="noopener noreferrer">NEXUS MODS <ExternalLink size={14}/></a></div></footer>
    {authOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Entrar ou criar conta"><button className="modal-x" onClick={()=>setAuthOpen(false)} aria-label="Fechar"><X/></button><div className="kicker">// JOIN THE FRONTIER</div><h2>{authMode==='login'?'BEM-VINDO DE VOLTA.':'JUNTE-SE À COMUNIDADE.'}</h2><p className="modal-sub">{authMode==='login'?'Entre na sua conta para comentar e gerenciar seus feedbacks.':'Crie uma conta para compartilhar sua experiência com os mods.'}</p><form onSubmit={submitAuth}>{authMode==='signup' && <label>NOME DE EXIBIÇÃO<input required maxLength={40} minLength={2} value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Como devemos chamar você?"/></label>}<label>E-MAIL<input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>SENHA<input type="password" minLength={6} required value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label>{authMessage && <div className="form-message">{authMessage}</div>}<button className="btn btn-red form-submit" disabled={authBusy}>{authBusy?'AGUARDE...':authMode==='login'?'ENTRAR':'CRIAR CONTA'} <ArrowRight size={17}/></button></form><div className="modal-toggle">{authMode==='login'?'Ainda não tem uma conta?':'Já tem uma conta?'} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthMessage('')}}>{authMode==='login'?'Cadastre-se':'Entrar'}</button></div></div></div>}
    {reviewOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setReviewOpen(false)}}><div className="modal review-modal" role="dialog" aria-modal="true" aria-label="Escrever feedback"><button className="modal-x" onClick={()=>setReviewOpen(false)} aria-label="Fechar"><X/></button><div className="kicker">// {editId?'EDIT YOUR REVIEW':'SHARE YOUR THOUGHTS'}</div><h2>{editId?'EDITAR FEEDBACK.':'DEIXE SUA MARCA.'}</h2><p className="modal-sub">Avalie <strong>{current?.title}</strong> e conte o que achou.</p><form onSubmit={saveFeedback}><label>TIPO DE FEEDBACK<select value={kind} onChange={e=>setKind(e.target.value)}><option value="review">Avaliação geral</option><option value="suggestion">Sugestão</option><option value="bug">Relatar bug</option></select></label><label>SUA AVALIAÇÃO</label><div className="rating-picker" role="group" aria-label="Nota de 1 a 5 estrelas">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={`${n} estrelas`} onClick={()=>setRating(n)}><Star size={31} fill={n<=rating?'currentColor':'none'} className={n<=rating?'star-on':'star-off'}/></button>)}<span>{rating} / 5</span></div><label>SEU FEEDBACK<textarea required minLength={10} maxLength={2000} rows={6} value={content} onChange={e=>setContent(e.target.value)} placeholder="O que você gostou? Encontrou algum bug? Tem alguma sugestão?"/><small>{content.length} / 2000 caracteres (mínimo 10)</small></label>{message && <div className="form-message">{message}</div>}<button className="btn btn-red form-submit" disabled={saving || content.trim().length<10}>{saving?'SALVANDO...':editId?'SALVAR ALTERAÇÕES':'PUBLICAR FEEDBACK'} <Send size={16}/></button></form></div></div>}
    {configured && <div className="connected-indicator"><Check size={12}/> CONECTADO</div>}
  </div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)
