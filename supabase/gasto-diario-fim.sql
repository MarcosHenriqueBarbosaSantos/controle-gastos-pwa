-- Gasto fixo de todo dia que acaba ao somar um valor: "fim" guarda o último dia (inclusive). Só acrescenta uma coluna vazia: não altera nenhum dado.
alter table public.fixos add column if not exists fim date;
