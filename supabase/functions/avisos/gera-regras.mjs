// Gera regras.js: só as regras de js/calc.js que o servidor de avisos usa (vencimentos, fixos, faturas, custo do mês, limite, metas, resumo da semana e lembrete do dia).
// Rode depois de mudar o calc.js:  node supabase/functions/avisos/gera-regras.mjs
// O teste tests/avisos.test.mjs falha se o regras.js estiver desatualizado.
import { readFileSync, writeFileSync } from "node:fs";

const NOMES = ["pad", "mKey", "addM", "dim", "round2", "fixosDoMes", "diaDaSemana", "ocorrencias", "CARTAO", "noCartao", "diaNoMes", "mesesEntre",
  "mesDaFatura", "valorDasParcelas", "faturasDoMes", "faturasAte", "diasEntre", "proximosVencimentos", "pendenciasParaAviso",
  "RETIRADA", "calcMes", "projetaDiaADia", "usoDoTeto",
  "sinalRes", "guardadoPorMes", "andamentoDaMeta", "metasEmAndamento", "sugestaoDaMeta", "lembreteDaMeta", "parabensDaMeta",
  "toISO", "sequenciaDeDias", "maisDias", "resumoDaSemana", "lembreteDoDia"];

export function geraRegras(calc) {
  // Cada declaração de primeiro nível começa na coluna 0 e vai até a próxima.
  const semComentarios = calc.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\s+\/\/ .*$/, "").trimEnd()).filter((l) => l.trim());
  const blocos = [];
  for (const l of semComentarios) { if (/^(export )?(const|function|let) /.test(l)) blocos.push([l]); else if (blocos.length) blocos[blocos.length - 1].push(l); }
  const nome = (b) => b[0].match(/^(?:export )?(?:const|function|let) (\w+)/)[1];
  const escolhidos = blocos.filter((b) => NOMES.includes(nome(b)));
  const faltam = NOMES.filter((n) => !escolhidos.some((b) => nome(b) === n));
  if (faltam.length) throw new Error("Não achei no calc.js: " + faltam.join(", "));
  return "// GERADO a partir de js/calc.js por gera-regras.mjs. Não edite: mude o calc.js e gere de novo.\n" + escolhidos.map((b) => b.join("\n")).join("\n") + "\n";
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const calc = readFileSync(new URL("../../../js/calc.js", import.meta.url), "utf8");
  writeFileSync(new URL("./regras.js", import.meta.url), geraRegras(calc));
  console.log("regras.js gerado");
}
