import { createFileRoute, Link } from "@tanstack/react-router";
import { Screen } from "@/components/calu/chrome";

export const Route = createFileRoute("/termos")({ component: TermsPage });

function TermsPage() {
  return (
    <Screen>
      <Link to="/" className="text-sm text-muted">
        Voltar
      </Link>
      <h1 className="mt-4 font-display text-3xl font-medium">Termos de Uso</h1>
      <div className="mt-4 space-y-4 text-sm leading-6 text-muted">
        <p>O CALU é um assistente para registrar e compreender hábitos alimentares. Não é nutricionista, médico ou serviço de emergência.</p>
        <p>Números de calorias e nutrientes são estimativas, referências de tabela ou dados de rótulo. Não são valores exatos do seu prato. Você confirma o que entra no diário.</p>
        <p>Metas são pontos de partida editáveis. O aplicativo não recomenda ingestões muito baixas e não prescreve dietas terapêuticas, medicamentos ou diagnósticos.</p>
        <p>Há um limite diário de análises de IA para evitar abuso. O plano gratuito e o Premium diferem nesse limite. A cobrança ainda não está ativa.</p>
        <p>Você é responsável pelo que registra. Não use o CALU para orientar outra pessoa em situação clínica.</p>
        <p>Se algo que você perguntar for clínico ou grave, a Calu deve indicar um profissional de saúde. Em sofrimento emocional no Brasil, o CVV atende em 188.</p>
      </div>
    </Screen>
  );
}
