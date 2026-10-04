import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";

const base = process.env.CALU_E2E_BASE_URL || "http://127.0.0.1:8080";
const aiConfigured = Boolean(process.env.XAI_API_KEY || process.env.GEMINI_API_KEY);
const stamp = Date.now();

function email(tag) {
  return `e2e-${stamp}-${tag}@example.com`;
}

async function signup(page, address, name) {
  await page.goto(`${base}/login`);
  await page.getByRole("heading", { name: "Entre no CALU" }).waitFor();
  if (await page.getByRole("button", { name: "Criar uma conta" }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Criar uma conta" }).click();
  }
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill(name);
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(address);
  await page.getByRole("textbox", { name: "Senha", exact: true }).fill("senha-e2e-22");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByRole("heading", { name: "Conheça a Calu" }).waitFor();
}

async function finishProfile(page, { age, height = "170", weight = "70" }) {
  await page.getByRole("button", { name: "Pular introdução" }).click();
  await page.getByRole("heading", { name: "Seu perfil" }).waitFor();
  await page.getByRole("textbox", { name: "Idade", exact: true }).fill(String(age));
  if (height) await page.getByRole("textbox", { name: "Altura (cm)", exact: true }).fill(height);
  if (weight) await page.getByRole("textbox", { name: "Peso (kg)", exact: true }).fill(weight);
  await page.getByRole("checkbox", { name: /Política de Privacidade/ }).check();
  await page.getByRole("button", { name: "Começar" }).click();
}

test("fluxos críticos E01–E25", { timeout: 240_000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(25_000);
  const adult = email("a");
  const other = email("b");
  const minor = email("c");
  const food = "Tapioca, com manteiga";
  try {
    await page.goto(base);
    await page.getByRole("heading", { name: "Entre no CALU" }).waitFor();
    assert.match(await page.locator("body").innerText(), /CALU/);

    await page.goto(`${base}/perfil`);
    await page.getByRole("heading", { name: "Entre no CALU" }).waitFor();

    await signup(page, adult, "Ana E2E");
    await page.getByRole("button", { name: "Pular introdução" }).click();
    await page.getByRole("textbox", { name: "Idade", exact: true }).fill("12");
    await page.getByRole("textbox", { name: "Altura (cm)", exact: true }).fill("170");
    await page.getByRole("textbox", { name: "Peso (kg)", exact: true }).fill("70");
    await page.getByRole("checkbox", { name: /Política de Privacidade/ }).check();
    await page.getByRole("button", { name: "Começar" }).click();
    await page.getByText("Idade entre 13 e 120").waitFor();

    await page.getByRole("textbox", { name: "Idade", exact: true }).fill("32");
    await page.getByRole("combobox", { name: /Fuso horário/ }).selectOption("America/Sao_Paulo");
    await page.getByRole("button", { name: "Começar" }).click();
    await page.getByRole("heading", { name: /Olá, Ana E2E/ }).waitFor();
    assert.match(await page.locator("body").innerText(), /Calorias/);
    assert.match(await page.locator("body").innerText(), /Referência diária estimada/);
    assert.match(await page.locator("body").innerText(), /Análises de foto hoje: 0\/5/);

    await page.reload();
    await page.getByRole("heading", { name: /Olá, Ana E2E/ }).waitFor();

    await page.getByRole("button", { name: "Buscar alimento" }).click();
    await page.getByPlaceholder("Arroz, feijão, tapioca...").fill("tapioca");
    await page.getByRole("button", { name: /Tapioca/ }).click();
    await page.getByRole("heading", { name: "Confira sua refeição" }).waitFor();
    assert.match(await page.locator("body").innerText(), /kcal/);
    assert.match(await page.locator("body").innerText(), /TACO|Fonte: TACO/);
    await page.getByRole("button", { name: "Confirmar refeição" }).click();
    await page.getByText("A refeição entrou no seu dia.").waitFor();
    await page.getByRole("button", { name: "Ver o dia" }).click();
    await page.getByText(food).waitFor();
    assert.match(await page.locator("body").innerText(), /Registro do dia/);

    await page.getByRole("button", { name: "+200 ml" }).click();
    await page.getByText("0,2").waitFor();

    await page.getByRole("link", { name: "Diário" }).click();
    await page.getByRole("heading", { name: "Resumo do dia" }).waitFor();
    assert.match(await page.locator("body").innerText(), new RegExp(food));
    assert.equal(await page.getByRole("button", { name: "Dia seguinte" }).isDisabled(), true);
    const meal = page.locator("li", { hasText: food }).first();
    await meal.getByRole("button").first().click();
    await meal.locator("input[name='quantity']").fill("150");
    await meal.getByRole("button", { name: "Atualizar" }).click();
    await page.getByText("Alimento atualizado").waitFor();
    await meal.getByRole("button", { name: "Repetir", exact: true }).click();
    await page.getByText("Alimento repetido").waitFor();
    await meal.getByRole("button", { name: "Repetir refeição", exact: true }).click();
    await page.getByText("Refeição repetida").waitFor();
    assert.equal(await page.getByRole("button", { name: "Pedir um olhar da Calu" }).isVisible(), true);
    const coach = page.getByRole("region", { name: "CALU Coach" });
    await coach.getByRole("heading", { name: "CALU Coach" }).waitFor();
    await page.getByRole("button", { name: "Por que estou vendo isso?" }).click();
    assert.match(await coach.innerText(), /registro|água|refeição|proteína|kcal/i);
    const coachBefore = await coach.innerText();
    await page.getByRole("button", { name: "+200 ml" }).click();
    await page.getByText("Água registrada").waitFor();
    await page.waitForFunction((previous) => {
      const region = document.querySelector('[aria-label="CALU Coach"]');
      return Boolean(region && region.textContent && region.textContent !== previous);
    }, coachBefore);
    await page.getByRole("textbox", { name: "Pergunta para o Coach" }).fill("Como está minha proteína?");
    await page.getByRole("button", { name: "Perguntar ao Coach" }).click();
    await page.getByText("A proteína registrada hoje é").waitFor();
    if (!aiConfigured) {
      await page.getByRole("textbox", { name: "Pergunta para o Coach" }).fill("Pode explicar com detalhes o conjunto destes registros?");
      await page.getByRole("button", { name: "Perguntar ao Coach" }).click();
      await page.getByText("Não consegui atualizar o Coach agora.").waitFor();
    }
    await page.getByRole("heading", { name: "Resumo do dia" }).waitFor();

    await page.goto(`${base}/registrar?modo=codigo`);
    await page.getByRole("button", { name: "Cadastrar manualmente" }).click();
    await page.getByRole("button", { name: "Confirmar refeição" }).click();
    await page.getByText("A refeição entrou no seu dia.").waitFor();
    await page.getByRole("button", { name: "Abrir diário" }).click();
    const partial = page.locator("li", { hasText: "Produto" }).first();
    await partial.getByText("Produto").waitFor();
    await partial.getByRole("button").first().click();
    await partial.getByText("Atenção: este registro precisa ser confirmado.").waitFor();
    assert.equal(await partial.getByRole("button", { name: "Confirmar" }).count(), 0);

    await page.getByRole("link", { name: "Progresso" }).click();
    await page.getByRole("heading", { name: "Progresso" }).waitFor();
    await page.getByPlaceholder("kg").fill("70");
    await page.getByRole("button", { name: "Registrar" }).click();
    await page.getByText(/70/).waitFor();
    await page.getByRole("checkbox", { name: "Frutas e vegetais", exact: true }).check();
    await page.getByText("Comi frutas ou vegetais hoje").waitFor();
    await page.getByRole("checkbox", { name: "Comi frutas ou vegetais hoje" }).click();
    await page.waitForTimeout(600);
    await page.reload();
    await page.getByRole("heading", { name: "Progresso" }).waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "Comi frutas ou vegetais hoje" }).isChecked(), true);
    await page.getByRole("button", { name: "Olhar da semana" }).click();
    await page.getByText("O que observei.").waitFor();

    await page.getByRole("link", { name: "Perfil" }).click();
    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Ana Editada");
    await page.getByRole("combobox", { name: /Fuso horário/ }).selectOption("America/Fortaleza");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await page.getByText("Perfil atualizado.").waitFor();
    await page.getByRole("checkbox", { name: "Lembretes", exact: true }).check();
    await page.waitForTimeout(500);
    await page.reload();
    await page.getByRole("heading", { name: "Notificações" }).waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "Lembretes", exact: true }).isChecked(), true);
    await page.getByRole("checkbox", { name: "Lembretes", exact: true }).uncheck();
    await page.waitForTimeout(500);
    await page.reload();
    await page.getByRole("heading", { name: "Notificações" }).waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "Lembretes", exact: true }).isChecked(), false);

    await page.goto(`${base}/registrar?modo=texto`);
    await page.getByRole("heading", { name: "O que você comeu?" }).waitFor();
    await page.getByPlaceholder("Comi 2 ovos, duas fatias de pão e uma banana.").fill("1 prato de arroz e feijão");
    if (!aiConfigured) {
      await page.goto(`${base}/registrar?modo=texto`);
      await page.getByPlaceholder("Comi 2 ovos, duas fatias de pão e uma banana.").fill("1 prato de arroz e feijão");
      let unavailable = false;
      let limited = false;
      for (let attempt = 0; attempt < 14 && !limited; attempt += 1) {
        if (attempt > 0) await page.goto(`${base}/registrar?modo=texto`);
        await page.getByPlaceholder("Comi 2 ovos, duas fatias de pão e uma banana.").fill("1 prato de arroz e feijão");
        await page.getByRole("button", { name: "Interpretar" }).click();
        await page.waitForFunction(
          () =>
            document.body.innerText.includes("não está disponível") ||
            document.body.innerText.includes("Muitas tentativas") ||
            document.body.innerText.includes("Não consegui"),
        );
        const text = await page.locator("body").innerText();
        if (text.includes("não está disponível") || text.includes("Não consegui")) unavailable = true;
        if (text.includes("Muitas tentativas")) limited = true;
      }
      assert.equal(unavailable, true);
      assert.equal(limited, true);
      await page.getByRole("heading", { name: "O que você comeu?" }).waitFor();
    }

    await page.goto(`${base}/perfil`);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByRole("heading", { name: "Entre no CALU" }).waitFor();

    await signup(page, other, "Bruno E2E");
    await finishProfile(page, { age: 34 });
    await page.getByRole("heading", { name: /Olá, Bruno E2E/ }).waitFor();
    assert.equal((await page.locator("body").innerText()).includes(food), false);
    await page.goto(`${base}/diario`);
    assert.equal((await page.locator("body").innerText()).includes(food), false);
    await page.goto(`${base}/perfil`);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByRole("heading", { name: "Entre no CALU" }).waitFor();

    await page.getByRole("button", { name: "Já tenho conta" }).click();
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(adult);
    await page.getByRole("textbox", { name: "Senha", exact: true }).fill("senha-e2e-22");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByRole("heading", { name: /Olá, Ana/ }).waitFor();
    assert.match(await page.locator("body").innerText(), new RegExp(food));

    await page.goto(`${base}/perfil`);
    await page.getByRole("button", { name: "Apagar meus dados" }).click();
    await page.getByRole("button", { name: "Apagar meus dados agora" }).click();
    await page.getByRole("heading", { name: "Conheça a Calu" }).waitFor();
    await page.goto(`${base}/`);
    await page.getByRole("heading", { name: "Conheça a Calu" }).waitFor();

    await page.getByRole("button", { name: "Excluir minha conta" }).waitFor({ state: "hidden" }).catch(() => undefined);
    await finishProfile(page, { age: 32 });
    await page.getByRole("heading", { name: /Olá,/ }).waitFor();
    await page.goto(`${base}/perfil`);
    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    await page.getByRole("button", { name: "Excluir minha conta agora" }).click();
    await page.getByRole("heading", { name: "Entre no CALU" }).waitFor();
    await page.getByRole("button", { name: "Já tenho conta" }).click();
    await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(adult);
    await page.getByRole("textbox", { name: "Senha", exact: true }).fill("senha-e2e-22");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByText(/não conferem|Não consegui entrar|Já existe/).waitFor();

    await page.goto(`${base}/login`);
    await signup(page, minor, "Lia E2E");
    await page.getByRole("button", { name: "Pular introdução" }).click();
    await page.getByRole("textbox", { name: "Idade", exact: true }).fill("15");
    await page.getByRole("textbox", { name: "Altura (cm)", exact: true }).fill("160");
    await page.getByRole("textbox", { name: "Peso (kg)", exact: true }).fill("50");
    await page.getByRole("checkbox", { name: /Política de Privacidade/ }).check();
    assert.match(await page.locator("body").innerText(), /não calculamos meta calórica adulta/);
    await page.getByRole("button", { name: "Começar" }).click();
    await page.getByRole("heading", { name: /Olá, Lia E2E/ }).waitFor();
    assert.match(await page.locator("body").innerText(), /Sem meta calórica automática/);
    assert.equal((await page.locator("body").innerText()).includes("Referência diária estimada"), false);
  } finally {
    await browser.close();
  }
});
