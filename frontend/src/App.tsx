import { formaterMontant } from './utils/formatageMontant';

/**
 * Écran d'accueil temporaire — Étape 1 ne livre que le bootstrap.
 * Les vrais écrans (onboarding, marketplace, dashboard) arriveront
 * aux étapes suivantes.
 */
export function Application(): JSX.Element {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <section className="glass max-w-mobile w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <span className="icone text-primaire" style={{ fontSize: '64px' }}>
            storefront
          </span>
        </div>

        <h1 className="font-titre text-3xl font-bold text-texte">
          Bor-Bi Tech
        </h1>

        <p className="font-corps text-texte-doux">
          La place de marché panafricaine, faite par des Africains,
          pour des Africains. La journée est encore longue.
        </p>

        <div className="glass p-4 inline-block">
          <p className="text-sm text-texte-doux mb-1">Exemple de montant</p>
          <p className="montant text-2xl text-secondaire">
            {formaterMontant(12500)}
          </p>
        </div>

        <p className="text-xs text-texte-doux">
          Bootstrap terminé — Étape 1 ✓
        </p>
      </section>
    </main>
  );
}
