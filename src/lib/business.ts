export type Movement = { date: string; amount: number };
export type Sale = { id: string; customer: string; product: string; quantity: number; unitPrice: number; unitCost?: number; discount: number; date: string; paymentMethod: string; payments: Movement[]; expectedDate?: string; notes?: string };
export type BizExpense = { id: string; description: string; category: string; amount: number; date: string; paymentMethod?: string; paid: boolean; paidDate?: string; dueDate?: string; notes?: string };
export type ScheduledPayment = { id: string; kind: 'receber' | 'pagar'; party: string; item: string; amount: number; dueDate: string; payments: Movement[]; notes?: string };
export type BusinessData = { sales: Sale[]; expenses: BizExpense[]; scheduled: ScheduledPayment[] };
export type AgendaItem = ScheduledPayment & { saleId?: string };
export const cents = (n: number) => Math.round((n + Number.EPSILON) * 100);
const sum = (values: number[]) => values.reduce((a, n) => a + cents(n), 0) / 100;
export const saleTotal = (s: Sale) => Math.max(0, cents(s.quantity * s.unitPrice) - cents(s.discount)) / 100;
export const paidOf = (item: { payments: Movement[] }) => sum(item.payments.map(p => p.amount));
export const remaining = (total: number, item: { payments: Movement[] }) => Math.max(0, cents(total) - cents(paidOf(item))) / 100;
export const statusOf = (total: number, item: { payments: Movement[] }) => paidOf(item) <= 0 ? 'pendente' : remaining(total, item) > 0 ? 'parcial' : 'pago';
export const saleProfit = (s: Sale) => s.unitCost === undefined ? null : (cents(saleTotal(s)) - cents(s.quantity * s.unitCost)) / 100;
export function addPayment<T extends { payments: Movement[] }>(item: T, total: number, payment: Movement): T {
  if (!Number.isFinite(payment.amount) || cents(payment.amount) <= 0) throw new Error('Informe um valor válido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.date) || new Date(`${payment.date}T12:00:00Z`).toISOString().slice(0,10) !== payment.date) throw new Error('Data inválida.');
  if (cents(payment.amount) > cents(remaining(total, item))) throw new Error('O valor não pode superar o saldo restante.');
  return { ...item, payments: [...item.payments, { ...payment, amount: cents(payment.amount)/100 }] };
}
export function agendaItems(b: BusinessData): AgendaItem[] {
  return [...b.scheduled, ...b.sales.filter(s => s.expectedDate && remaining(saleTotal(s),s)>0).map(s => ({ id: `sale-${s.id}`, saleId: s.id, kind: 'receber' as const, party: s.customer, item: s.product, amount: saleTotal(s), dueDate: s.expectedDate ?? s.date, payments: s.payments, ...(s.notes ? { notes: s.notes } : {}) }))].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
}
export function recordAgendaPayment(b: BusinessData, id: string, payment: Movement): BusinessData {
  const item = agendaItems(b).find(i => i.id===id);
  if (!item) throw new Error('Registro não existe mais.');
  if (item.saleId) return { ...b, sales: b.sales.map(s => s.id === item.saleId ? addPayment(s,saleTotal(s),payment) : s) };
  return { ...b, scheduled: b.scheduled.map(s => s.id===id ? addPayment(s,s.amount,payment) : s) };
}
export const businessDueOn = (b: BusinessData, date: string) => agendaItems(b).filter(i => i.dueDate===date && remaining(i.amount,i)>0);
export type Period = { start: string; end: string };
export function monthPeriod(date: string, offset=0): Period {
  const [year,month] = date.split('-').map(Number);
  const start = new Date(Date.UTC(year ?? 2026,(month ?? 1)-1+offset,1));
  const end = new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0));
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) };
}
const within = (date: string,p: Period) => date>=p.start && date<=p.end;
export function businessMetrics(b: BusinessData,p: Period) {
  const sales=b.sales.filter(s => within(s.date,p));
  const expenses=b.expenses.filter(e => within(e.date,p));
  const grossProfit=sum(sales.flatMap(s => { const n=saleProfit(s); return n===null ? [] : [n]; }));
  const expenseTotal=sum(expenses.map(e=>e.amount));
  const independentDue=sum(b.scheduled.filter(s=>s.kind==='pagar' && within(s.dueDate,p)).map(s=>s.amount));
  const incoming=sum([...b.sales.flatMap(s=>s.payments.filter(m=>within(m.date,p)).map(m=>m.amount)), ...b.scheduled.filter(s=>s.kind==='receber').flatMap(s=>s.payments.filter(m=>within(m.date,p)).map(m=>m.amount))]);
  const outgoing=sum([...b.expenses.filter(e=>e.paid && within(e.paidDate ?? e.date,p)).map(e=>e.amount), ...b.scheduled.filter(s=>s.kind==='pagar').flatMap(s=>s.payments.filter(m=>within(m.date,p)).map(m=>m.amount))]);
  const agenda=agendaItems(b);
  return { salesTotal: sum(sales.map(saleTotal)), salesCount: sales.length, received: sum(sales.map(paidOf)), pending: sum(sales.map(s=>remaining(saleTotal(s),s))), expenses: expenseTotal, costs: sum(sales.filter(s=>s.unitCost!==undefined).map(s=>s.quantity*(s.unitCost ?? 0))), grossProfit, unknownCosts: sales.filter(s=>s.unitCost===undefined).length, netProfit: sum([grossProfit,-expenseTotal,-independentDue]), receivable: sum(agenda.filter(i=>i.kind==='receber').map(i=>remaining(i.amount,i))), payable: sum([...agenda.filter(i=>i.kind==='pagar').map(i=>remaining(i.amount,i)),...b.expenses.filter(e=>!e.paid).map(e=>e.amount)]), incoming, outgoing, balance: sum([incoming,-outgoing]) };
}
export function expensesByCategory(b: BusinessData,p: Period) {
  const totals=new Map<string,number>();
  b.expenses.filter(e=>within(e.date,p)).forEach(e=>totals.set(e.category,(totals.get(e.category) ?? 0)+cents(e.amount)));
  const total=[...totals.values()].reduce((a,b)=>a+b,0);
  return [...totals].map(([category,value])=>({category,amount:value/100,percent:total ? value/total*100 : 0})).sort((a,b)=>b.amount-a.amount);
}
