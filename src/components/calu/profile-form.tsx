import { ACTIVITIES, DIETS, GOALS, type ActivityId, type DietId, type GoalId, type SexId } from "@/lib/calu/domain";
import { Field, controlClass } from "./chrome";

export type ProfileFormValue = {
  name: string;
  age: string;
  sex: SexId;
  heightCm: string;
  weightKg: string;
  goal: GoalId;
  activity: ActivityId;
  diet: DietId;
  dietNote: string;
  restrictions: string;
  consent: boolean;
};

export const emptyProfileForm = (): ProfileFormValue => ({
  name: "",
  age: "",
  sex: "nao_informar",
  heightCm: "",
  weightKg: "",
  goal: "acompanhar",
  activity: "leve",
  diet: "livre",
  dietNote: "",
  restrictions: "",
  consent: false,
});

export function ProfileFields({
  value,
  onChange,
  showConsent,
}: {
  value: ProfileFormValue;
  onChange: (next: ProfileFormValue) => void;
  showConsent?: boolean;
}) {
  const set = (patch: Partial<ProfileFormValue>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-4">
      <Field label="Nome">
        <input className={controlClass} value={value.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Idade">
          <input className={controlClass} inputMode="numeric" value={value.age} onChange={(e) => set({ age: e.target.value })} />
        </Field>
        <Field label="Sexo, se quiser">
          <select className={controlClass} value={value.sex} onChange={(e) => set({ sex: e.target.value as SexId })}>
            <option value="nao_informar">Não informar</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Altura (cm)">
          <input className={controlClass} inputMode="decimal" value={value.heightCm} onChange={(e) => set({ heightCm: e.target.value })} />
        </Field>
        <Field label="Peso (kg)">
          <input className={controlClass} inputMode="decimal" value={value.weightKg} onChange={(e) => set({ weightKg: e.target.value })} />
        </Field>
      </div>
      <Field label="Objetivo">
        <select className={controlClass} value={value.goal} onChange={(e) => set({ goal: e.target.value as GoalId })}>
          {GOALS.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Atividade">
        <select className={controlClass} value={value.activity} onChange={(e) => set({ activity: e.target.value as ActivityId })}>
          {ACTIVITIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Preferência alimentar">
        <select className={controlClass} value={value.diet} onChange={(e) => set({ diet: e.target.value as DietId })}>
          {DIETS.map((diet) => (
            <option key={diet.id} value={diet.id}>
              {diet.label}
            </option>
          ))}
        </select>
      </Field>
      {value.diet === "outra" ? (
        <Field label="Conte do seu jeito">
          <input className={controlClass} value={value.dietNote} onChange={(e) => set({ dietNote: e.target.value })} />
        </Field>
      ) : null}
      <Field label="Restrições, se quiser informar">
        <textarea
          className={controlClass + " h-24 py-3"}
          value={value.restrictions}
          onChange={(e) => set({ restrictions: e.target.value })}
          placeholder="A Calu não infere alergias."
        />
      </Field>
      {Number(value.age) > 0 && Number(value.age) < 16 ? (
        <p className="text-sm text-muted">O CALU é pensado para adultos. Menores devem usar com um responsável.</p>
      ) : null}
      {showConsent ? (
        <label className="flex items-start gap-3 text-sm leading-5">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={value.consent}
            onChange={(e) => set({ consent: e.target.checked })}
          />
          <span>
            Li a Política de Privacidade e os Termos. Entendo que a Calu faz estimativas e não substitui um profissional de saúde.
          </span>
        </label>
      ) : null}
    </div>
  );
}

export function toProfilePayload(value: ProfileFormValue, recalculate: boolean) {
  return {
    name: value.name,
    age: value.age.trim() ? Number(value.age) : null,
    sex: value.sex,
    heightCm: value.heightCm.trim() ? Number(value.heightCm.replace(",", ".")) : null,
    weightKg: value.weightKg.trim() ? Number(value.weightKg.replace(",", ".")) : null,
    goal: value.goal,
    activity: value.activity,
    diet: value.diet,
    dietNote: value.dietNote,
    restrictions: value.restrictions,
    consent: value.consent,
    recalculate,
  };
}
