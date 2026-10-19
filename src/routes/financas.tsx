function BusinessPanel() {
  const data = useData() as any;
  const [subTab, setSubTab] = useState<BusinessSubTab>("vendas");
  const [open, setOpen] = useState(false);
  const month = today().slice(0, 7);
  const [filterMonth, setFilterMonth] = useState(month);

  const sales = (data.businessSales || []).filter(
    (x: any) => x.date?.startsWith(filterMonth),
  );

  const expenses = (data.businessCosts || []).filter(
    (x: any) => x.date?.startsWith(filterMonth),
  );

  const bizBills = data.businessPayables || [];

  const totalSold = sales.reduce(
    (sum: number, sale: any) =>
      sum + Number(sale.total ?? Number(sale.unitPrice || 0) * Number(sale.quantity || 1)),
    0,
  );

  const totalReceived = sales
    .filter((sale: any) => sale.received)
    .reduce(
      (sum: number, sale: any) =>
        sum + Number(sale.total ?? Number(sale.unitPrice || 0) * Number(sale.quantity || 1)),
      0,
    );

  const totalExpenses = expenses.reduce(
    (sum: number, expense: any) => sum + Number(expense.amount || 0),
    0,
  );

  const netProfit = totalReceived - totalExpenses;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Vendas</p>
          <p className="font-semibold">{brl(totalSold)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="font-semibold text-success">{brl(totalReceived)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Gastos</p>
          <p className="font-semibold text-destructive">{brl(totalExpenses)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Saldo recebido</p>
          <p className="font-semibold">{brl(netProfit)}</p>
        </Card>
      </div>

      <input
        type="month"
        value={filterMonth}
        onChange={(e) => setFilterMonth(e.target.value || month)}
        className={field}
        aria-label="Filtrar negócio por mês"
      />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {(["vendas", "gastos", "contas"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key)}
            className={`rounded-lg py-2 text-sm font-semibold ${
              subTab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {key === "vendas" ? "Vendas" : key === "gastos" ? "Gastos" : "Contas"}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
        >
          <Plus className="h-5 w-5" />
          Novo registro
        </button>
      </div>

      {subTab === "vendas" && (
        <Card>
          {sales.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma venda registrada neste mês.
            </p>
          )}

          <ul className="divide-y">
            {sales.map((sale: any) => {
              const quantity = Number(sale.quantity || 1);
              const unitPrice = Number(sale.unitPrice || 0);
              const total = Number(sale.total ?? unitPrice * quantity);

              return (
                <li key={sale.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">{sale.product}</p>
                    <p className="text-xs text-muted-foreground">
                      {quantity} × {brl(unitPrice)}
                      {sale.customer ? ` · ${sale.customer}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(sale.date)}
                    </p>
                    <p
                      className={`mt-1 text-xs font-medium ${
                        sale.received ? "text-success" : "text-destructive"
                      }`}
                    >
                      {sale.received ? "Recebido" : "Pendente"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">{brl(total)}</p>
                    <button
                      type="button"
                      className="mt-1 text-xs text-primary underline"
                      onClick={() =>
                        update((d: any) => ({
                          ...d,
                          businessSales: (d.businessSales || []).map((item: any) =>
                            item.id === sale.id
                              ? { ...item, received: !item.received }
                              : item,
                          ),
                        }))
                      }
                    >
                      {sale.received ? "Desmarcar recebimento" : "Marcar recebido"}
                    </button>
                  </div>

                  <Del
                    onClick={() =>
                      update((d: any) => ({
                        ...d,
                        businessSales: (d.businessSales || []).filter(
                          (item: any) => item.id !== sale.id,
                        ),
                      }))
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {subTab === "gastos" && (
        <Card>
          {expenses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum gasto do negócio neste mês.
            </p>
          )}

          <ul className="divide-y">
            {expenses.map((expense: any) => (
              <li
                key={expense.id}
                className="flex items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">
                    {expense.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {expense.category} · {fmtDate(expense.date)}
                  </p>
                </div>

                <span className="font-semibold text-destructive">
                  −{brl(Number(expense.amount || 0))}
                </span>

                <Del
                  onClick={() =>
                    update((d: any) => ({
                      ...d,
                      businessCosts: (d.businessCosts || []).filter(
                        (item: any) => item.id !== expense.id,
                      ),
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {subTab === "contas" && (
        <Card>
          {bizBills.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta a pagar do negócio.
            </p>
          )}

          <ul className="divide-y">
            {bizBills.map((bill: any) => {
              const late = !bill.paid && bill.dueDate < today();

              return (
                <li key={bill.id} className="flex items-center gap-3 py-3">
                  <button
                    type="button"
                    aria-label={bill.paid ? "Marcar conta como pendente" : "Marcar conta como paga"}
                    onClick={() =>
                      update((d: any) => ({
                        ...d,
                        businessPayables: (d.businessPayables || []).map(
                          (item: any) =>
                            item.id === bill.id
                              ? { ...item, paid: !item.paid }
                              : item,
                        ),
                      }))
                    }
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${
                      bill.paid
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {bill.paid && <Check className="h-4 w-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`break-words font-medium ${
                        bill.paid ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {bill.description}
                    </p>
                    <p
                      className={`text-xs ${
                        late ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {late ? "Atrasada · " : "Vence "}
                      {fmtDate(bill.dueDate)}
                    </p>
                  </div>

                  <span className="font-semibold">
                    {brl(Number(bill.amount || 0))}
                  </span>

                  <Del
                    onClick={() =>
                      update((d: any) => ({
                        ...d,
                        businessPayables: (d.businessPayables || []).filter(
                          (item: any) => item.id !== bill.id,
                        ),
                      }))
                    }
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <BusinessDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function BusinessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState<"venda" | "gasto" | "conta">("venda");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("1");
  const [client, setClient] = useState("");
  const [cat, setCat] = useState(BIZ_CATS[0]);
  const [date, setDate] = useState(today());
  const [paid, setPaid] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const value = money(amount);
    const quantity = Math.floor(Number(qty));

    if (!desc.trim() || !Number.isFinite(value) || value <= 0) {
      alert("Informe uma descrição e um valor válido maior que zero.");
      return;
    }

    if (type === "venda" && (!Number.isInteger(quantity) || quantity < 1)) {
      alert("A quantidade precisa ser um número inteiro maior que zero.");
      return;
    }

    update((d: any) => {
      if (type === "venda") {
        return {
          ...d,
          businessSales: [
            ...(d.businessSales || []),
            {
              id: uid(),
              product: desc.trim(),
              quantity,
              unitPrice: roundMoney(value),
              total: roundMoney(value * quantity),
              customer: client.trim(),
              received: paid,
              date,
            },
          ],
        };
      }

      if (type === "gasto") {
        return {
          ...d,
          businessCosts: [
            ...(d.businessCosts || []),
            {
              id: uid(),
              description: desc.trim(),
              amount: roundMoney(value),
              category: cat,
              date,
            },
          ],
        };
      }

      return {
        ...d,
        businessPayables: [
          ...(d.businessPayables || []),
          {
            id: uid(),
            description: desc.trim(),
            amount: roundMoney(value),
            dueDate: date,
            paid,
          },
        ],
      };
    });

    setDesc("");
    setAmount("");
    setQty("1");
    setClient("");
    setCat(BIZ_CATS[0]);
    setDate(today());
    setPaid(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo registro no Negócio</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {(["venda", "gasto", "conta"] as const).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setType(key)}
                className={`rounded-lg py-2 text-xs font-semibold capitalize ${
                  type === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {key === "venda" ? "Venda" : key === "gasto" ? "Gasto" : "Conta"}
              </button>
            ))}
          </div>

          <input
            required
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={
              type === "venda"
                ? "Nome do produto / serviço"
                : type === "gasto"
                  ? "Descrição do gasto"
                  : "Descrição da conta"
            }
            className={field}
          />

          {type === "venda" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Quantidade"
                className={field}
              />
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Preço unitário (R$)"
                className={field}
              />
            </div>
          )}

          {type !== "venda" && (
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor (R$)"
              className={field}
            />
          )}

          {type === "venda" && (
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nome do cliente (opcional)"
              className={field}
            />
          )}

          {type === "gasto" && (
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className={field}
            >
              {BIZ_CATS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}

          <label className="block text-sm text-muted-foreground">
            {type === "conta" ? "Vencimento" : "Data"}
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${field} mt-1`}
            />
          </label>

          <label className="flex items-center gap-2 pt-1 text-sm">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            {type === "venda"
              ? "Já recebido"
              : type === "conta"
                ? "Já pago"
                : "Gasto já pago"}
          </label>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            Salvar registro
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
