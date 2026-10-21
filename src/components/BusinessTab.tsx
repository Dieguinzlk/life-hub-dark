import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Check, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData, update, uid, today, brl, fmtDate } from '@/lib/store';
import { saleSchema, expenseSchema, scheduledSchema, money, validDate } from '@/lib/data-validation';
import { agendaItems, saleTotal, saleProfit, paidOf, remaining, statusOf, recordAgendaPayment, businessMetrics, monthPeriod, expensesByCategory, cents, type Sale, type BizExpense, type ScheduledPayment, type AgendaItem } from '@/lib/business';
import { ensureReminderFor } from '@/lib/notifications';
import { toast } from 'sonner';
const methods=['Pix','Dinheiro','Cartão de crédito','Cartão de débito','Boleto','Transferência','Outro'];
const categories=['Mercadorias e produtos','Transporte e entregas','Marketing','Taxas e tarifas','Outros gastos'];
const field='h-11 w-full min-w-0 rounded-lg border bg-input/40 px-3 text-base outline-none focus:border-primary';
type Section='Painel'|'Vendas'|'Agendados'|'Gastos';
type Editor={ kind:'sale'; value?:Sale }|{ kind:'expense'; value?:BizExpense }|{ kind:'scheduled'; value?:ScheduledPayment };
const statusLabel=(total:number,item:{payments:{date:string;amount:number}[]})=>({pendente:'Pendente',parcial:'Parcial',pago:'Pago'})[statusOf(total,item)];
export function BusinessTab(){
 const data=useData(); const b=data.business;
 const [section,setSection]=useState<Section>('Painel');
 const [editor,setEditor]=useState<Editor|null>(null);
 const [payment,setPayment]=useState<AgendaItem|null>(null);
 const [periodMode,setPeriodMode]=useState('atual');
 const [custom,setCustom]=useState(monthPeriod(today()));
 const [category,setCategory]=useState('Todas');
 const period=periodMode==='personalizado'?custom:monthPeriod(today(),periodMode==='anterior'?-1:0);
 const metrics=businessMetrics(b,period); const chart=expensesByCategory(b,period);
 const agenda=agendaItems(b);
 const remove=(kind:Editor['kind'],id:string)=>{
  if(!confirm('Excluir este registro comercial?'))return;
  try{update(d=>({...d,business:{...d.business,...(kind==='sale'?{sales:d.business.sales.filter(s=>s.id!==id)}:kind==='expense'?{expenses:d.business.expenses.filter(e=>e.id!==id)}:{scheduled:d.business.scheduled.filter(s=>s.id!==id)})}}));}catch(e){toast.error(e instanceof Error?e.message:'Não foi salvo.');}
 };
 const actions=(kind:Editor['kind'],value:Sale|BizExpense|ScheduledPayment)=><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" aria-label={`Editar ${kind==='sale'?(value as Sale).product:kind==='expense'?(value as BizExpense).description:(value as ScheduledPayment).item}`} onClick={()=>setEditor({kind,value} as Editor)}><Pencil/></Button><Button variant="ghost" size="icon" aria-label="Excluir registro comercial" onClick={()=>remove(kind,value.id)}><Trash2/></Button></div>;
 const empty=<p className="py-6 text-sm text-muted-foreground">Nenhum registro neste período.</p>;
 return <section aria-label="Negócio" className="space-y-4">
  <div className="flex gap-1 border-b pb-2">{(['Painel','Vendas','Agendados','Gastos'] as Section[]).map(s=><Button key={s} variant={section===s?'secondary':'ghost'} className="min-w-0 flex-1 px-1 text-xs" onClick={()=>setSection(s)}>{s}</Button>)}</div>
  {section==='Painel'?<>
   <label className="block text-sm">Período<select className={`${field} mt-1`} value={periodMode} onChange={e=>setPeriodMode(e.target.value)}><option value="atual">Mês atual</option><option value="anterior">Mês anterior</option><option value="personalizado">Intervalo personalizado</option></select></label>
   {periodMode==='personalizado'&&<div className="grid grid-cols-2 gap-2"><label className="text-sm">De<input type="date" className={field} value={custom.start} onChange={e=>setCustom({...custom,start:e.target.value})}/></label><label className="text-sm">Até<input type="date" className={field} value={custom.end} onChange={e=>setCustom({...custom,end:e.target.value})}/></label></div>}
   <div className="grid grid-cols-2 gap-3">{([['Vendas',metrics.salesTotal],['Recebido das vendas',metrics.received],['Vendas pendentes',metrics.pending],['Gastos',metrics.expenses],['Custos conhecidos',metrics.costs],['Lucro bruto estimado',metrics.grossProfit],['Lucro líquido estimado',metrics.netProfit],['A receber · em aberto',metrics.receivable],['A pagar · em aberto',metrics.payable],['Entradas efetivas',metrics.incoming],['Saídas efetivas',metrics.outgoing],['Saldo comercial',metrics.balance]] as [string,number][]).map(([label,value])=><div key={label} className="min-w-0 rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 break-words text-base font-semibold ${value<0?'text-destructive':'text-foreground'}`}>{brl(value)}</p></div>)}</div>
   <p className="text-xs text-muted-foreground">{metrics.salesCount} venda(s) · {metrics.unknownCosts} sem custo conhecido</p>
   <h3 className="font-semibold">Gastos por categoria</h3>{chart.length===0?empty:<><div className="h-48" role="img" aria-label="Distribuição dos gastos comerciais"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chart} dataKey="amount" nameKey="category" innerRadius={52} outerRadius={78}>{chart.map((c,i)=><Cell key={c.category} fill={`var(--chart-${i%5+1})`}/>)}</Pie></PieChart></ResponsiveContainer></div><ul className="space-y-2">{chart.map((c,i)=><li key={c.category} className="flex items-start gap-2 text-sm"><span className={`mt-1 h-3 w-3 shrink-0 rounded-full business-chart-${i%5+1}`}/><span className="min-w-0 flex-1">{c.category}</span><span className="text-right">{brl(c.amount)}<small className="block text-muted-foreground">{c.percent.toFixed(1)}%</small></span></li>)}</ul></>}
  </>:<>
   <Button onClick={()=>setEditor({kind:section==='Vendas'?'sale':section==='Gastos'?'expense':'scheduled'})}><Plus/> {section==='Vendas'?'Nova venda':section==='Gastos'?'Novo gasto':'Novo agendamento'}</Button>
   {section==='Vendas'&&(b.sales.length===0?empty:<ul className="divide-y">{[...b.sales].sort((a,b)=>b.date.localeCompare(a.date)).map(s=><li key={s.id} className="py-4"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{s.product}</h3><p className="break-words text-sm text-muted-foreground">{s.customer} · {fmtDate(s.date)}</p></div>{actions('sale',s)}</div><div className="mt-2 flex flex-wrap justify-between gap-2 text-sm"><span>{brl(saleTotal(s))} · {statusLabel(saleTotal(s),s)}</span><span className="text-success">Recebido {brl(paidOf(s))}</span></div><p className="mt-1 text-xs text-muted-foreground">{saleProfit(s)===null?'Custo não informado':`Lucro estimado ${brl(saleProfit(s) ?? 0)}`}{s.expectedDate?` · Esperado ${fmtDate(s.expectedDate)}`:''}</p>{remaining(saleTotal(s),s)>0&&<Button variant="outline" className="mt-3" onClick={()=>setPayment({id:`sale-${s.id}`,saleId:s.id,kind:'receber',party:s.customer,item:s.product,amount:saleTotal(s),dueDate:s.expectedDate ?? s.date,payments:s.payments})}><Wallet/> Registrar recebimento</Button>}</li>)}</ul>)}
   {section==='Agendados'&&(['Hoje','Próximos','Em atraso','Quitados'] as const).map(group=>{
    const items=agenda.filter(i=>remaining(i.amount,i)===0?group==='Quitados':group==='Hoje'?i.dueDate===today():group==='Próximos'?i.dueDate>today():group==='Em atraso'?i.dueDate<today():false);
    return <div key={group}><h3 className="mb-2 font-semibold">{group}</h3>{items.length===0?<p className="text-xs text-muted-foreground">Nenhum registro.</p>:<ul className="divide-y">{items.map(i=><li key={i.id} className="py-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="break-words font-medium">{i.party} · {i.item}</p><p className="mt-1 text-xs text-muted-foreground">{i.kind==='receber'?'A receber':'A pagar'} · {fmtDate(i.dueDate)}{i.saleId?' · Venda vinculada':''}</p></div>{!i.saleId&&actions('scheduled',i)}</div><p className="mt-2 text-sm">Saldo {brl(remaining(i.amount,i))} · {statusLabel(i.amount,i)}</p><div className="mt-2 flex flex-wrap gap-2">{remaining(i.amount,i)>0&&<Button variant="outline" onClick={()=>setPayment(i)}>{i.kind==='receber'?'Receber':'Pagar'}</Button>}{i.saleId&&<Button variant="ghost" onClick={()=>{const sale=b.sales.find(s=>s.id===i.saleId);if(sale)setEditor({kind:'sale',value:sale});}}>Editar venda</Button>}</div></li>)}</ul>}</div>;
   })}
   {section==='Gastos'&&<><label className="block text-sm">Categoria<select className={field} value={category} onChange={e=>setCategory(e.target.value)}>{['Todas',...categories].map(c=><option key={c}>{c}</option>)}</select></label><ul className="divide-y">{b.expenses.filter(e=>category==='Todas'||e.category===category).map(e=><li key={e.id} className="py-4"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{e.description}</p><p className="text-xs text-muted-foreground">{e.category} · {fmtDate(e.date)}</p></div>{actions('expense',e)}</div><p className="mt-2 text-sm text-destructive">{brl(e.amount)} · {e.paid?'Pago':'Pendente'}</p>{!e.paid&&<Button variant="outline" className="mt-2" onClick={()=>setEditor({kind:'expense',value:{...e,paid:true,paidDate:today()}})}><Check/> Marcar pago</Button>}</li>)}</ul>{b.expenses.length===0&&empty}</>}
  </>}
  {editor&&<BusinessEditor editor={editor} onClose={()=>setEditor(null)}/>}
  {payment&&<PaymentDialog item={payment} onClose={()=>setPayment(null)}/>}
 </section>;
}
function BusinessEditor({editor,onClose}:{editor:Editor;onClose:()=>void}){
 const value=editor.value;
 const [error,setError]=useState('');
 const [draft,setDraft]=useState<Record<string,string>>(()=>{
  const initial:Record<string,string>={date:today(),dueDate:today(),quantity:'1',unitPrice:'',unitCost:'',discount:'0',paymentMethod:'Pix',status:'pendente',received:'0',paid:'false',category:categories[0] ?? 'Outros gastos'};
  if(value){Object.entries(value).forEach(([k,v])=>{if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')initial[k]=String(v);});if(editor.kind==='sale'){initial['status']=statusOf(saleTotal(editor.value ?? value as Sale),value as Sale);initial['received']=String(paidOf(value as Sale));}}
  return initial;
 });
 const change=(k:string,v:string)=>setDraft(d=>({...d,[k]:v}));
 const input=(k:string,label:string,type='text',required=false)=><label className="block text-sm" key={k}>{label}<input className={`${field} mt-1`} name={k} type={type} required={required} min={type==='number'?'0':undefined} step={type==='number'?'any':undefined} value={draft[k] ?? ''} onChange={e=>change(k,e.target.value)}/></label>;
 const select=(k:string,label:string,options:{value:string;label:string}[])=><label className="block text-sm">{label}<select className={`${field} mt-1`} value={draft[k] ?? ''} onChange={e=>change(k,e.target.value)}>{options.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select></label>;
 const numeric=(k:string)=>money(draft[k] ?? '');
 const save=(event:FormEvent)=>{
  event.preventDefault();setError('');
  try{
   const id=value?.id ?? uid();
   const notes=draft['notes']?.trim();
   const optional={...(notes?{notes}:{})};
   if(editor.kind==='sale'){
    const total=Math.max(0,cents(numeric('quantity')*numeric('unitPrice'))-cents(numeric('discount')))/100;
    const received=draft['status']==='pago'?total:draft['status']==='parcial'?numeric('received'):0;
    if(draft['status']==='parcial'&&(!Number.isFinite(received)||received<=0||received>=total))throw new Error('O valor parcial deve ser maior que zero e menor que o total.');
    const old=editor.value;
    const payments=old&&cents(paidOf(old))===cents(received)?old.payments:received>0?[{amount:received,date:draft['date'] ?? today()}]:[];
    if(cents(received)>cents(total))throw new Error('Recebimento acima do total.');
    const sale=saleSchema.parse({...(old ?? {}),id,customer:draft['customer'],product:draft['product'],quantity:numeric('quantity'),unitPrice:numeric('unitPrice'),unitCost:draft['unitCost']?numeric('unitCost'):undefined,discount:numeric('discount'),date:draft['date'],paymentMethod:draft['paymentMethod'],payments,expectedDate:draft['expectedDate']||undefined,notes:notes||undefined,...optional});
    update(d=>({...d,business:{...d.business,sales:old?d.business.sales.map(s=>s.id===id?sale:s):[...d.business.sales,sale]}}));
    if(sale.expectedDate&&remaining(saleTotal(sale),sale)>0){toast.success('Venda salva. Também aparece em Agendados → A receber.');void ensureReminderFor(sale.expectedDate);}else toast.success('Venda salva.');
   }else if(editor.kind==='expense'){
    const expense=expenseSchema.parse({...(editor.value ?? {}),id,description:draft['description'],category:draft['category'],amount:numeric('amount'),date:draft['date'],paid:draft['paid']==='true',paidDate:draft['paid']==='true'?(draft['paidDate']||draft['date']):undefined,dueDate:draft['dueDate']||undefined,paymentMethod:draft['paymentMethod']||undefined,notes:notes||undefined});
    update(d=>({...d,business:{...d.business,expenses:value?d.business.expenses.map(e=>e.id===id?expense:e):[...d.business.expenses,expense]}}));
    if(!expense.paid&&expense.dueDate)void ensureReminderFor(expense.dueDate);
   }else{
    const scheduled=scheduledSchema.parse({...(editor.value ?? {}),id,kind:draft['kind']||'receber',party:draft['party'],item:draft['item'],amount:numeric('amount'),dueDate:draft['dueDate'],payments:editor.value?.payments ?? [],notes:notes||undefined});
    if(cents(paidOf(scheduled))>cents(scheduled.amount))throw new Error('O total não pode ser menor que o valor já pago.');
    update(d=>({...d,business:{...d.business,scheduled:value?d.business.scheduled.map(s=>s.id===id?scheduled:s):[...d.business.scheduled,scheduled]}}));void ensureReminderFor(scheduled.dueDate);
   }
   onClose();
  }catch(e){setError(e instanceof Error && !('issues' in e)?e.message:'Confira os campos, valores e datas.');}
 };
 const preview:Sale={id:'preview',customer:'',product:'',quantity:numeric('quantity'),unitPrice:numeric('unitPrice'),discount:numeric('discount'),date:today(),paymentMethod:'Pix',payments:[],...(draft['unitCost']?{unitCost:numeric('unitCost')}:{})};
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{value?'Editar':'Novo'} {editor.kind==='sale'?'venda':editor.kind==='expense'?'gasto':'agendamento'}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-3">
  {editor.kind==='sale'?<>{input('customer','Cliente / comprador','text',true)}{input('product','Produto / serviço','text',true)}<div className="grid grid-cols-2 gap-3">{input('quantity','Quantidade','number',true)}{input('unitPrice','Preço unitário (R$)','number',true)}{input('unitCost','Custo unitário (R$)','number')}{input('discount','Desconto (R$)','number',true)}</div><p className="text-sm">Total {brl(Number.isFinite(saleTotal(preview))?saleTotal(preview):0)}{draft['unitCost']&&Number.isFinite(saleProfit(preview))?` · Lucro ${brl(saleProfit(preview) ?? 0)}`:''}</p>{input('date','Data da venda','date',true)}{select('paymentMethod','Forma de pagamento',methods.map(m=>({value:m,label:m})))}{select('status','Status',[{value:'pendente',label:'Pendente'},{value:'parcial',label:'Parcial'},{value:'pago',label:'Pago'}])}{draft['status']==='parcial'&&input('received','Valor já recebido (R$)','number',true)}{input('expectedDate','Data esperada de recebimento','date')}</>:editor.kind==='expense'?<>{input('description','Descrição','text',true)}{select('category','Categoria',categories.map(c=>({value:c,label:c})))}{input('amount','Valor (R$)','number',true)}{input('date','Data do gasto','date',true)}{select('paymentMethod','Forma de pagamento',methods.map(m=>({value:m,label:m})))}{select('paid','Status',[{value:'false',label:'Pendente'},{value:'true',label:'Pago'}])}{draft['paid']==='true'?input('paidDate','Data do pagamento','date'):input('dueDate','Vencimento','date')}</>:<>{select('kind','Tipo',[{value:'receber',label:'A receber'},{value:'pagar',label:'A pagar'}])}{input('party','Pessoa / cliente / empresa','text',true)}{input('item','Produto / serviço / item','text',true)}{input('amount','Valor (R$)','number',true)}{input('dueDate','Vencimento','date',true)}</>}
  <label className="block text-sm">Observações<textarea className="mt-1 min-h-20 w-full rounded-lg border bg-input/40 p-3" value={draft['notes'] ?? ''} onChange={e=>change('notes',e.target.value)}/></label>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-2"><Button type="submit" className="flex-1">Salvar</Button><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button></div>
 </form></DialogContent></Dialog>;
}
function PaymentDialog({item,onClose}:{item:AgendaItem;onClose:()=>void}){
 const [amount,setAmount]=useState(String(remaining(item.amount,item)));const [date,setDate]=useState(today());const [error,setError]=useState('');
 return <Dialog open onOpenChange={o=>{if(!o)onClose();}}><DialogContent><DialogHeader><DialogTitle>{item.kind==='receber'?'Registrar recebimento':'Registrar pagamento'}</DialogTitle></DialogHeader><p className="text-sm">{item.party} · {item.item}<br/>Saldo {brl(remaining(item.amount,item))}</p><form className="space-y-3" onSubmit={e=>{e.preventDefault();try{if(!validDate.safeParse(date).success)throw new Error('Data inválida.');update(d=>{
  // A venda pode não ter data esperada: receber diretamente ainda usa o mesmo registro.
  if(item.saleId&&!agendaItems(d.business).some(i=>i.id===item.id)){
   const sale=d.business.sales.find(s=>s.id===item.saleId);if(!sale)throw new Error('Venda não existe mais.');
   const linked={...d.business,sales:d.business.sales.map(s=>s.id===item.saleId?{...s,expectedDate:s.expectedDate ?? s.date}:s)};
   const next=recordAgendaPayment(linked,item.id,{amount:money(amount),date});
   return {...d,business:{...next,sales:next.sales.map(s=>s.id===sale.id?{...s,expectedDate:sale.expectedDate}:s)}};
  }
  return {...d,business:recordAgendaPayment(d.business,item.id,{amount:money(amount),date})};
 });onClose();}catch(e){setError(e instanceof Error?e.message:'Não foi salvo.');}}}><label className="block text-sm">Valor (R$)<input className={field} type="number" step="0.01" min="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label className="block text-sm">Data<input className={field} type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="w-full">Confirmar {item.kind==='receber'?'recebimento':'pagamento'}</Button></form></DialogContent></Dialog>;
}
