import { useMemo, useState } from 'react'
import { ArrowLeft, Bug, CheckCircle2, MessageSquare, Pencil, Plus, Save, ShieldCheck, Trash2, X } from 'lucide-react'
import type { Feedback, Mod } from './lib'
import { errorMessage, supabase } from './lib'

type Release = {id:string;mod_id:string;version:string;notes:string;published_at:string}
type Props = { mods: Mod[]; feedbacks: Feedback[]; releases:Release[]; onReleasesChange:()=>Promise<void>; onClose: () => void; onRefresh: () => Promise<void> }
type ModForm = Pick<Mod, 'slug'|'title'|'description'|'version'|'category'|'cover_url'|'nexus_url'>
const blank: ModForm = {slug:'',title:'',description:'',version:'v1.0',category:'GAMEPLAY',cover_url:null,nexus_url:null}
const statuses = [{value:'new',label:'Novo'},{value:'reviewing',label:'Em análise'},{value:'planned',label:'Planejado'},{value:'resolved',label:'Resolvido'}]
export default function AdminPanel({mods,feedbacks,releases,onReleasesChange,onClose,onRefresh}:Props) {
 const [tab,setTab] = useState<'overview'|'mods'|'feedback'|'releases'>('overview')
 const [editing,setEditing] = useState<string|null>(null)
 const [form,setForm] = useState<ModForm>(blank)
 const [editor,setEditor] = useState(false)
 const [busy,setBusy] = useState(false)
 const [notice,setNotice] = useState('')
 const [filter,setFilter] = useState('all')
 const [releaseMod,setReleaseMod]=useState('')
 const [releaseVersion,setReleaseVersion]=useState('')
 const [releaseNotes,setReleaseNotes]=useState('')
 const [drafts,setDrafts] = useState<Record<string,string>>({})
 const stats = useMemo(() => ({bugs:feedbacks.filter(f=>f.kind==='bug').length, suggestions:feedbacks.filter(f=>f.kind==='suggestion').length, open:feedbacks.filter(f=>f.status!=='resolved').length}),[feedbacks])
 const saveMod = async (e:React.FormEvent) => {
  e.preventDefault(); if(!supabase||busy)return
  setBusy(true);setNotice('')
  const payload={...form,slug:form.slug.trim().toLowerCase(),title:form.title.trim(),description:form.description.trim(),cover_url:form.cover_url?.trim()||null,nexus_url:form.nexus_url?.trim()||null}
  const result=editing?await supabase.from('mods').update(payload).eq('id',editing):await supabase.from('mods').insert(payload)
  setBusy(false);if(result.error){setNotice(errorMessage(result.error));return}setEditor(false);setEditing(null);setNotice('Mod salvo com sucesso.');await onRefresh()
 }
 const removeMod = async (m:Mod)=>{
  if(!supabase||!window.confirm(`Excluir "${m.title}" e TODOS os feedbacks associados? Essa ação é permanente.`))return
  const {error}=await supabase.from('mods').delete().eq('id',m.id)
  setNotice(error?errorMessage(error):'Mod excluído.'); if(!error)await onRefresh()
 }
 const removeFeedback = async (f:Feedback) => {
  if(!supabase || !window.confirm(`Remover permanentemente o feedback de ${f.author_name}? Suas respostas e curtidas também serão apagadas.`))return
  setBusy(true);setNotice('')
  const {error}=await supabase.from('feedback').delete().eq('id',f.id)
  setBusy(false)
  setNotice(error?errorMessage(error):'Feedback removido pela moderação.')
  if(!error)await onRefresh()
 }
 const updateFeedback=async (f:Feedback, patch:Record<string,string|boolean>)=>{
  if(!supabase)return;setBusy(true);setNotice('')
  const {error}=await supabase.from('feedback').update(patch).eq('id',f.id)
  setBusy(false);setNotice(error?errorMessage(error):'Feedback atualizado.');if(!error)await onRefresh()
 }
 const addRelease=async(e:React.FormEvent)=>{
  e.preventDefault();if(!supabase||!releaseMod||!releaseVersion.trim()||!releaseNotes.trim()||busy)return
  setBusy(true);const {error}=await supabase.from('mod_releases').insert({mod_id:releaseMod,version:releaseVersion.trim(),notes:releaseNotes.trim()});setBusy(false)
  setNotice(error?error.message:'Atualização publicada.');if(!error){setReleaseVersion('');setReleaseNotes('');await onReleasesChange()}
 }
 const deleteRelease=async(id:string)=>{
  if(!supabase||!window.confirm('Excluir esta entrada do histórico?'))return
  const {error}=await supabase.from('mod_releases').delete().eq('id',id)
  setNotice(error?error.message:'Atualização removida.');if(!error)await onReleasesChange()
 }
 const changeTab=(v:typeof tab)=>{setTab(v);setNotice('')}
 const shown=feedbacks.filter(f=>filter==='all'||f.kind===filter||f.status===filter)
 return <main className="admin shell">
  <button className="back" onClick={onClose}><ArrowLeft size={18}/> VOLTAR AO SITE</button>
  <div className="admin-heading"><div><div className="kicker">// EXCLUSIVE CREATOR ACCESS</div><h1>PAINEL <span>ADMIN.</span></h1><p>Gerencie seus mods e acompanhe a comunidade em tempo real.</p></div><ShieldCheck size={44}/></div>
  <div className="admin-tabs"><button className={tab==='overview'?'active':''} onClick={()=>changeTab('overview')}>VISÃO GERAL</button><button className={tab==='mods'?'active':''} onClick={()=>changeTab('mods')}>MEUS MODS</button><button className={tab==='feedback'?'active':''} onClick={()=>changeTab('feedback')}>FEEDBACKS</button><button className={tab==='releases'?'active':''} onClick={()=>changeTab('releases')}>ATUALIZAÇÕES</button></div>
  {notice&&<div className="inline-message" role="status">{notice}</div>}
  {tab==='overview'&&<><div className="admin-stats">{[[mods.length,'MODS PUBLICADOS'],[feedbacks.length,'FEEDBACKS RECEBIDOS'],[stats.bugs,'RELATOS DE BUGS'],[stats.suggestions,'SUGESTÕES'],[stats.open,'NÃO RESOLVIDOS']].map(([v,label])=><div key={label}><strong>{v}</strong><span>{label}</span></div>)}</div><div className="v4-insights"><h2>NOTAS POR MOD</h2>{mods.map(m=>{const reviews=feedbacks.filter(f=>f.mod_id===m.id);const avg=reviews.length?(reviews.reduce((sum,f)=>sum+f.rating,0)/reviews.length).toFixed(1):'—';return <div key={m.id}><span>{m.title}</span><strong>{avg} ★</strong><small>{reviews.length} avaliações</small></div>})}</div><div className="admin-hint"><CheckCircle2/><div><h3>CENTRAL DO CRIADOR</h3><p>Cadastre mods, responda comentários com sua identificação de desenvolvedor, destaque sugestões e acompanhe o status de bugs. Apenas contas autorizadas no Supabase podem usar essas funções.</p></div></div></>}
  {tab==='releases'&&<section className="v4-release-admin"><h2>PUBLICAR CHANGELOG</h2><p>As novidades aparecem automaticamente na página pública de cada mod.</p><form onSubmit={e=>void addRelease(e)}><label>MOD<select required value={releaseMod} onChange={e=>setReleaseMod(e.target.value)}><option value="">Selecione um mod</option>{mods.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>VERSÃO<input required maxLength={40} value={releaseVersion} onChange={e=>setReleaseVersion(e.target.value)} placeholder="v1.6"/></label><label>NOVIDADES<textarea required maxLength={4000} rows={5} value={releaseNotes} onChange={e=>setReleaseNotes(e.target.value)} placeholder="Correções, melhorias e novidades..."/></label><button className="btn btn-red" disabled={busy}>PUBLICAR ATUALIZAÇÃO</button></form><div className="v4-release-admin-list">{releases.map(r=><article key={r.id}><div><strong>{mods.find(m=>m.id===r.mod_id)?.title||'Mod'} · {r.version}</strong><p>{r.notes}</p></div><button onClick={()=>void deleteRelease(r.id)}><Trash2 size={15}/> Excluir</button></article>)}</div></section>}
  {tab==='mods'&&<><div className="admin-toolbar"><h2>CATÁLOGO ({mods.length})</h2><button className="btn btn-red" onClick={()=>{setEditing(null);setForm(blank);setEditor(true)}}><Plus size={16}/> NOVO MOD</button></div><div className="admin-mods">{mods.map(m=><article key={m.id}><div><h3>{m.title}</h3><p>{m.version} · {m.category} · {feedbacks.filter(f=>f.mod_id===m.id).length} feedbacks</p></div><div className="admin-actions"><button onClick={()=>{setEditing(m.id);setForm({slug:m.slug,title:m.title,description:m.description,version:m.version,category:m.category,cover_url:m.cover_url,nexus_url:m.nexus_url});setEditor(true)}}><Pencil size={16}/> Editar</button><button className="danger" onClick={()=>void removeMod(m)}><Trash2 size={16}/> Excluir</button></div></article>)}</div></>}
  {tab==='feedback'&&<><div className="admin-toolbar"><h2>COMUNIDADE ({feedbacks.length})</h2><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtrar feedbacks"><option value="all">Todos</option><option value="bug">Bugs</option><option value="suggestion">Sugestões</option><option value="review">Avaliações</option>{statuses.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></div><div className="admin-feedbacks">{shown.map(f=><article key={f.id}><div className="admin-feedback-title"><div><strong>{f.author_name}</strong><span>em {mods.find(m=>m.id===f.mod_id)?.title||'Mod removido'}</span></div><span className="admin-kind">{f.kind==='bug'?<Bug size={14}/>:<MessageSquare size={14}/>} {f.kind==='bug'?'Bug':f.kind==='suggestion'?'Sugestão':'Avaliação'} · {f.rating}/5</span></div><p>{f.content}</p><div className="admin-fields"><label>STATUS<select value={f.status} disabled={busy} onChange={e=>void updateFeedback(f,{status:e.target.value})}>{statuses.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label><label className="check-field"><input type="checkbox" checked={f.is_featured} disabled={busy} onChange={e=>void updateFeedback(f,{is_featured:e.target.checked})}/> Destacar feedback</label></div><div className="admin-actions"><button className="danger" disabled={busy} onClick={()=>void removeFeedback(f)}><Trash2 size={15}/> EXCLUIR FEEDBACK</button></div><div className="admin-reply"><label>RESPOSTA DO DESENVOLVEDOR<textarea rows={2} maxLength={2000} value={drafts[f.id]??f.admin_reply??''} onChange={e=>setDrafts(d=>({...d,[f.id]:e.target.value}))} placeholder="Escreva uma resposta pública..."/></label><button disabled={busy} className="btn btn-outline" onClick={()=>void updateFeedback(f,{admin_reply:(drafts[f.id]??f.admin_reply??'').trim()})}><Save size={15}/> SALVAR RESPOSTA</button></div></article>)}{shown.length===0&&<div className="empty">Nenhum feedback corresponde ao filtro.</div>}</div></>}
  {editor&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditor(false)}}><div className="modal admin-modal" role="dialog" aria-modal="true" aria-label="Editor de mod"><button className="modal-x" onClick={()=>setEditor(false)}><X/></button><div className="kicker">// MOD MANAGEMENT</div><h2>{editing?'EDITAR MOD.':'NOVO MOD.'}</h2><form onSubmit={e=>void saveMod(e)}>{([['title','NOME'],['slug','SLUG ÚNICO'],['version','VERSÃO'],['category','CATEGORIA'],['cover_url','URL DA CAPA (HTTPS)'],['nexus_url','LINK NEXUS MODS (HTTPS)']] as const).map(([key,label])=><label key={key}>{label}<input required={key==='title'||key==='slug'||key==='version'||key==='category'} maxLength={key==='slug'?80:500} value={form[key]??''} onChange={e=>setForm(prev=>({...prev,[key]:e.target.value}))} placeholder={key==='slug'?'meu-mod':undefined}/></label>)}<label>DESCRIÇÃO<textarea maxLength={2000} value={form.description} onChange={e=>setForm(prev=>({...prev,description:e.target.value}))}/></label><button disabled={busy} className="btn btn-red form-submit">{busy?'SALVANDO...':'SALVAR MOD'} <Save size={16}/></button></form></div></div>}
 </main>
}
