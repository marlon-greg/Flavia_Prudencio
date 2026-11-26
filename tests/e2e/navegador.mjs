// Teste de ponta a ponta no navegador (Playwright). Requer o servidor rodando e o banco recém-populado:
//   rm -rf .data && npm run seed && npm run build && npm start   (em outro terminal)
//   npm run test:e2e
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3123";
const SENHA = process.env.SENHA || "studio2026";
const res = [];
const ok = (nome, cond, info = "") => { res.push({ nome, ok: !!cond, info }); console.log(cond ? "PASSOU" : "FALHOU", "|", nome, info ? `| ${info}` : ""); };
const arq = new URL("./comprovante.png", import.meta.url).pathname;
fs.writeFileSync(arq, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

const browser = await chromium.launch();
const erros = [];
async function novaPagina(largura = 1280) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", e => erros.push(String(e)));
  return p;
}
async function login(p, email, senha = SENHA) {
  await p.goto(`${BASE}/login`);
  await p.fill("input[name=email]", email);
  await p.fill("input[name=senha]", senha);
  await Promise.all([p.waitForLoadState("networkidle"), p.click("button:has-text('Entrar')")]);
  await p.waitForTimeout(800);
}
const largura = p => p.evaluate(() => document.documentElement.scrollWidth);
const msg = async p => { await p.waitForSelector(".msg.ok, .msg.erro", { timeout: 15000 }); return (await p.locator(".msg.ok, .msg.erro").last().textContent()).trim(); };

// ---------- Site público ----------
let p = await novaPagina();
await p.goto(BASE);
const txt = (await p.textContent("#planos")).replace(/\u00a0/g, " ");
ok("RF01 planos vêm do banco", txt.includes("R$ 220,00") && txt.includes("R$ 90,00"));
const wa = await p.getAttribute("a.whats-flutuante", "href");
ok("RF03 botão de WhatsApp no site", wa?.startsWith("https://wa.me/"), wa);
await p.fill("#matricula input[name=nome]", "Teste Pré E2E");
await p.fill("#matricula input[name=telefone]", "123");
await p.click("button:has-text('Enviar pré-matrícula')");
ok("RF02 telefone inválido é recusado", (await msg(p)).includes("telefone"));
await p.fill("#matricula input[name=telefone]", "(19) 98888-7777");
await p.click("button:has-text('Enviar pré-matrícula')");
await p.waitForSelector(".msg.ok");
ok("RF02 pré-matrícula enviada", true);

const m = await novaPagina(375);
await m.goto(BASE);
ok("Responsivo: site em 375 px", (await largura(m)) <= 375, `${await largura(m)} px`);

// ---------- Login ----------
await login(p, "ana@studio.local", "errada123");
ok("Login com senha errada é recusado", (await msg(p)).includes("incorretos"));

// Cookie forjado
const pf = await novaPagina();
await pf.context().addCookies([{ name: "sfp_sessao", value: "eyJhbGciOiJub25lIn0.eyJ1aWQiOjEsInBlcmZpbCI6ImRvbmEifQ.", url: BASE }]);
await pf.goto(`${BASE}/admin/relatorios`);
ok("Sessão forjada sem assinatura não entra", pf.url().endsWith("/login"), pf.url());
await pf.goto(`${BASE}/portal`);
ok("Sem login, /portal manda para /login", pf.url().endsWith("/login"));

// ---------- Aluno sem anamnese (Bruno) ----------
const b = await novaPagina();
await login(b, "bruno@studio.local");
ok("Login do aluno abre o portal", b.url().endsWith("/portal"), b.url());
// Outra aluna (Ana) observa as vagas do mesmo horário antes e depois da reposição do Bruno.
const obs = await novaPagina();
await login(obs, "ana@studio.local");
await obs.goto(`${BASE}/portal/reposicao`);
const rotulo = (await obs.locator(".card.aula .hora").first().textContent()).trim();
const vagasDe = async () => { await obs.goto(`${BASE}/portal/reposicao`); const c = obs.locator(".card.aula", { hasText: rotulo }); return (await c.count()) ? parseInt(await c.locator(".tag").textContent()) : 0; };
const vagasAntes = await vagasDe();
await b.goto(`${BASE}/portal/reposicao`);
await b.locator(".card.aula", { hasText: rotulo }).locator("button:has-text('Reservar')").click();
ok("RN05 sem anamnese, reposição recusada", (await msg(b)).includes("anamnese"));
await b.goto(`${BASE}/portal/anamnese`);
await b.fill("textarea[name=objetivo]", "Dor lombar");
await b.check("input[name=ciente]");
await b.click("button:has-text('Salvar anamnese')");
ok("RF04 anamnese salva", (await msg(b)).includes("Anamnese salva"));
await b.goto(`${BASE}/portal/reposicao`);
const card = b.locator(".card.aula", { hasText: rotulo });
await card.locator("button:has-text('Reservar')").click();
ok("RF06 reposição marcada depois da anamnese", (await msg(b)).includes("Reposição marcada") && b.url().includes("/portal"));
await b.reload();
ok("RF06 reposição aparece nas próximas aulas (após recarregar)", (await b.locator(".tag.repo").count()) === 1);
const vagasDepois = await vagasDe();
ok("RN04 vagas diminuem em 1 após a reposição (após recarregar)", vagasDepois === vagasAntes - 1, `${rotulo}: ${vagasAntes} -> ${vagasDepois} (outro aluno vê)`);
await b.goto(`${BASE}/portal`);
ok("RF07 portal mostra o plano", (await b.textContent("body")).includes("Trimestral 3x por semana"));
ok("RF08 WhatsApp no portal", (await b.locator("a.whats").getAttribute("href")).startsWith("https://wa.me/"));

// ---------- Aluna Ana: cancelamento ----------
const a = await novaPagina();
await login(a, "ana@studio.local");
const antesCanc = await a.locator("summary:has-text('Cancelar esta aula')").count();
await a.locator("summary:has-text('Cancelar esta aula')").first().click();
await a.locator("details[open] input[name=motivo]").fill("Viagem");
await a.locator("details[open] button:has-text('Confirmar cancelamento')").click();
ok("RF05 cancelamento com mais de 60 min, sem atestado: aceito", (await msg(a)).includes("cancelada"));
await a.reload();
ok("RF05 cancelamento gravado (após recarregar)", (await a.locator("summary:has-text('Cancelar esta aula')").count()) === antesCanc - 1 && (await a.locator(".tag.cancelada").count()) >= 1);
const am = await novaPagina(375);
await am.context().addCookies(await a.context().cookies());
await am.goto(`${BASE}/portal`);
ok("Responsivo: portal em 375 px", (await largura(am)) <= 375, `${await largura(am)} px`);

// ---------- Recepção ----------
const r = await novaPagina();
await login(r, "recepcao@studio.local");
ok("Login da recepção abre o painel", r.url().endsWith("/admin"));
ok("RF12 menu da recepção sem Relatórios", !(await r.locator("nav a:has-text('Relatórios')").count()));
await r.goto(`${BASE}/admin/relatorios`);
ok("RF12 recepção em /admin/relatorios: acesso negado", r.url().endsWith("/acesso-negado"), r.url());
await r.goto(`${BASE}/admin/funcionarios`);
ok("RF12 recepção em /admin/funcionarios: acesso negado", r.url().endsWith("/acesso-negado"));
const api = await r.request.get(`${BASE}/api/relatorios`);
ok("RF12 recepção em /api/relatorios: HTTP 403", api.status() === 403, String(api.status()));

// Grade: terça mais recente (Ana, Gabriela, João e Larissa às 09:00)
const hoje = new Date(Date.now() - 3 * 3600e3);
const t = new Date(hoje); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() - 2 + 7) % 7));
const terca = t.toISOString().slice(0, 10);
await r.goto(`${BASE}/admin?data=${terca}`);
const aula9 = r.locator(".card.aula", { has: r.locator(".hora", { hasText: "09:00" }) });
ok("RF09 grade diária mostra a turma das 09:00 com 4/4", (await aula9.locator(".cab .tag").textContent()).trim() === "4/4");
await aula9.locator(".lugar", { hasText: "Ana Beatriz" }).locator("button:has-text('Marcar falta')").click();
ok("RF10 falta registrada", (await msg(r)).includes("Falta registrada"));
await a.goto(`${BASE}/portal`);
ok("RN03 falta aparece no portal da aluna", (await a.locator(".tag.falta").count()) >= 1);

// Cadastro e RN01
await r.goto(`${BASE}/admin/alunos`);
await r.click("summary:has-text('Cadastrar aluno')");
await r.fill("details[open] input[name=nome]", "Quinta Pessoa E2E");
await r.fill("details[open] input[name=telefone]", "(19) 97777-6666");
await r.click("details[open] button:has-text('Cadastrar')");
ok("Cadastro de aluno pelo painel grava", (await msg(r)).includes("cadastrado"));
await r.reload();
ok("Aluno cadastrado aparece na lista (após recarregar)", (await r.locator("tr", { hasText: "Quinta Pessoa E2E" }).count()) === 1);
// Dá anamnese? Não: tenta matricular e espera RN05. Depois usa aluna com anamnese (Camila) para RN01.
const linhaQ = r.locator("tr", { hasText: "Quinta Pessoa E2E" });
await linhaQ.locator("select[name=horarioId]").selectOption({ label: "Ter 09:00" });
await linhaQ.locator("button:has-text('OK')").click();
ok("RN05 matrícula sem anamnese recusada", (await msg(r)).includes("anamnese"));
await r.reload();
const linhaC = r.locator("tr", { hasText: "Camila Vasconcelos" });
await linhaC.locator("select[name=horarioId]").selectOption({ label: "Ter 09:00" });
await linhaC.locator("button:has-text('OK')").click();
ok("RN01 quinto aluno no mesmo horário recusado", (await msg(r)).includes("lotad"), await r.locator(".msg").last().textContent());

// Financeiro
await r.goto(`${BASE}/admin/financeiro`);
const pend = await r.locator("details.lugar").count();
const nLanc = async () => parseInt((await r.locator("p.muted.small", { hasText: "lançamento(s)" }).textContent()));
const lancAntes = await nLanc();
await r.locator("details.lugar summary").first().click();
await r.locator("details[open] input[name=comprovante]").setInputFiles(arq);
await r.locator("details[open] button:has-text('Dar baixa')").click();
ok("RF11 baixa com comprovante", (await msg(r)).includes("baixado"));
await r.goto(`${BASE}/admin/financeiro`);
ok("RF11 pendentes diminuem e entrada vai para o caixa (após recarregar)", (await r.locator("details.lugar").count()) === pend - 1 && (await nLanc()) === lancAntes + 1, `pendentes ${pend}->${await r.locator("details.lugar").count()}`);
await r.fill("input[name=descricao]", "Conta de luz E2E");
await r.fill("input[name=valor]", "380,00");
await r.click("button:has-text('Lançar')");
ok("RF14 despesa lançada", (await msg(r)).includes("Despesa lançada"));
await r.reload();
ok("RF14 despesa gravada (após recarregar)", (await r.locator("td", { hasText: "Conta de luz E2E" }).count()) === 1 && (await nLanc()) === lancAntes + 2);
await r.goto(`${BASE}/admin/pre-matriculas`);
ok("RF02 pré-matrícula do site chega ao painel", (await r.locator("tr", { hasText: "Teste Pré E2E" }).count()) === 1);
const rm = await novaPagina(375);
await rm.context().addCookies(await r.context().cookies());
await rm.goto(`${BASE}/admin`);
ok("Responsivo: painel em 375 px", (await largura(rm)) <= 375, `${await largura(rm)} px`);

// ---------- Proprietária ----------
const d = await novaPagina();
await login(d, "flavia@studio.local");
await d.goto(`${BASE}/admin/relatorios`);
ok("RF13/RF16 proprietária abre relatórios", d.url().endsWith("/admin/relatorios") && (await d.textContent("body")).includes("Alunos ativos"));
const apiD = await d.request.get(`${BASE}/api/relatorios`);
ok("RF16 /api/relatorios para a proprietária: HTTP 200", apiD.status() === 200);
await d.goto(`${BASE}/admin/funcionarios`);
await d.fill("input[name=nome]", "Recepcionista E2E");
await d.fill("input[name=email]", "rec2.e2e@studio.local");
await d.fill("input[name=senha]", "senhaforte1");
await d.click("button:has-text('Cadastrar')");
ok("RF15 funcionário cadastrado", (await msg(d)).includes("cadastrado"));
await d.reload();
const linhaF = d.locator("tr", { hasText: "Recepcionista E2E" });
await linhaF.locator("button:has-text('Desativar')").click();
await d.waitForTimeout(1500);
const nf = await novaPagina();
await login(nf, "rec2.e2e@studio.local", "senhaforte1");
ok("RF15 funcionário desativado não consegue entrar", (await msg(nf)).includes("incorretos"));
for (const pg of ["/admin", "/admin/alunos", "/admin/financeiro"]) { await d.goto(BASE + pg); }
ok("RF13 proprietária acessa grade, alunos e financeiro", d.url().endsWith("/admin/financeiro"));

ok("Nenhum erro de JavaScript nas páginas", erros.length === 0, erros.slice(0, 3).join(" ; "));
await browser.close();
const f = res.filter(x => !x.ok);
console.log(`\nTOTAL ${res.length} | PASSARAM ${res.length - f.length} | FALHARAM ${f.length}`);
