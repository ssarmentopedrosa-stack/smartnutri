import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/calu/chrome";

export const Route = createFileRoute("/privacidade")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <Screen>
      <Link to="/" className="text-sm text-muted">
        Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl font-medium">Política de Privacidade</h1>
      <div className="mt-4 space-y-4 text-sm leading-6 text-muted">
        <p>O CALU trata dados de alimentação, medidas e conversas com a assistente porque isso é o serviço. Não pedimos o que não usamos.</p>
        <p>A conta identifica você. O perfil (nome, idade, sexo se informado, altura, peso, objetivo, atividade, preferências e restrições que você escrever) serve para estimar metas e personalizar a linguagem. O diário guarda refeições confirmadas, água, peso e hábitos que você ativar.</p>
        <p>Fotos de refeição são enviadas ao provedor de IA só para gerar a estimativa. Não ficam armazenadas no diário. Texto e voz transcrita também seguem para essa análise, a seu pedido. A chave da IA fica no servidor, nunca no aplicativo.</p>
        <p>Não usamos suas fotos nem o diário para treinar modelos. Não vendemos dados. A memória da Calu só guarda frases que você confirmar.</p>
        <p>Versão desta política: 2026-10-03. O consentimento fica registrado com essa versão quando o perfil é criado.</p>
        <p>Você pode exportar seus dados, apagar os dados nutricionais mantendo o login, ou excluir a conta inteira no perfil. Fotos de refeição não ficam armazenadas.</p>
        <p>Base legal, em linhas gerais: execução do serviço que você pediu e, no onboarding, consentimento para tratar os dados de perfil e alimentação. Você pode retirar o uso apagando os dados.</p>
        <p>A Calu não é serviço de saúde. Estimativas não são diagnóstico.</p>
      </div>
    </Screen>
  );
}
