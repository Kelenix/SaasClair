import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données SaasClair traite, pourquoi, où elles sont hébergées, combien de temps, et vos droits.",
  alternates: { canonical: "/confidentialite" },
};

const CONTACT = "lionelkelenix@gmail.com";
const UPDATED = "31 octobre 2026";

/** Une section : titre, puis paragraphes ou listes. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  );
}

const List = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc space-y-1.5 pl-6 marker:text-emerald-ink">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

/**
 * Politique de confidentialité (RGPD). Ne décrit que ce que fait réellement le code (collecte,
 * cookies, sous-traitants, hébergement vérifié) ; toute nouvelle collecte doit y être ajoutée.
 * À faire relire par un juriste (docs/manual-tasks.md, tâche n° 9).
 */
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-10 sm:py-16">
      <Reveal>
        <p className="eyebrow">Confidentialité</p>
        <h1 className="mb-5 text-[36px] leading-tight sm:text-[48px]">
          Politique de confidentialité
        </h1>
        <p className="mb-10 text-lg text-slate">
          Ce que SaasClair fait de vos données, en clair. Dernière mise à jour : {UPDATED}.
        </p>
      </Reveal>

      <div className="space-y-10 text-[17px] leading-relaxed text-ink">
        <Section title="Qui est responsable de vos données">
          <p>
            SaasClair est édité par <strong>Kelenix Tech</strong> (responsable : Lionel). Pour toute
            question sur vos données, écrivez à{" "}
            <a className="font-semibold text-forest underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </Section>

        <Section title="Les données de votre compte">
          <List
            items={[
              "Votre email et votre prénom, pour créer et sécuriser votre compte.",
              "Votre mot de passe, jamais stocké en clair : seule une empreinte chiffrée est gardée.",
              "Si vous vous connectez avec Google ou GitHub : votre email, votre nom et votre photo de profil, transmis par ce service.",
              "Le canal par lequel vous avez découvert SaasClair (par exemple une recherche Google ou LinkedIn), pour mesurer nos propres campagnes.",
            ]}
          />
        </Section>

        <Section title="Les données de votre SaaS">
          <List
            items={[
              "L'adresse de votre site, et l'analyse de sa page d'accueil publique (pages clés, vitesse, référencement, technologies).",
              <>
                <strong>Avec le script installé sur votre site</strong> : les pages vues, le site
                d&apos;origine, les paramètres de campagne (UTM), la largeur d&apos;écran et un
                identifiant aléatoire du visiteur, gardé dans le navigateur sur votre site. Pas de
                cookie tiers, pas d&apos;adresse IP enregistrée, et les adresses des pages sont
                gardées sans leurs paramètres. Si vous identifiez un inscrit, seule une empreinte
                chiffrée de son email nous parvient.
              </>,
              <>
                <strong>Avec Stripe connecté</strong> : vos clients (nom, email), leurs abonnements
                et leurs factures des 12 derniers mois. SaasClair ne fait que lire : nous ne
                modifions jamais rien sur votre compte Stripe.
              </>,
            ]}
          />
          <p>
            Pour les données de vos propres visiteurs et clients, vous restez responsable de
            traitement et SaasClair agit comme sous-traitant, uniquement pour vous fournir le
            service. Pensez à mentionner SaasClair (mesure d&apos;audience) dans votre propre
            politique de confidentialité.
          </p>
        </Section>

        <Section title="Pourquoi nous les traitons">
          <List
            items={[
              "Fournir le service que vous avez demandé (compte, analyses, alertes) : exécution du contrat.",
              "Protéger le service contre les abus et les intrusions : intérêt légitime.",
              "Vous envoyer la newsletter, si vous vous y êtes inscrit : votre consentement, retirable à tout moment.",
              "Mesurer nos campagnes publicitaires (Google, Meta, LinkedIn) : uniquement avec votre accord, donné dans le bandeau des cookies.",
            ]}
          />
        </Section>

        <Section title="Cookies et stockage dans votre navigateur">
          <List
            items={[
              "Session de connexion (Supabase) : indispensable pour rester connecté.",
              "sc_provenance (30 jours) : le canal de votre première visite, gardé sur saasclair.com uniquement.",
              "sc_periode et sc_barre_repliee : vos préférences d'affichage du tableau de bord.",
              "sc_stripe_state (10 minutes) : protège la connexion à Stripe contre les falsifications.",
              "sc_consentement et sc_notifications_lues (stockage local) : votre choix sur les cookies et les alertes déjà lues.",
              "Traceurs publicitaires (Google Ads, Google Analytics, Meta, LinkedIn) : jamais chargés sans votre accord. « Gérer les cookies », en bas de page, permet de changer d'avis.",
            ]}
          />
        </Section>

        <Section title="Où sont vos données, et qui y a accès">
          <p>
            Vos données sont hébergées sur notre serveur, situé à{" "}
            <strong>Francfort (Allemagne)</strong>, chez Hostinger. Seuls ces prestataires
            interviennent, chacun pour une tâche précise :
          </p>
          <List
            items={[
              "Hostinger : hébergement du serveur (Allemagne).",
              "Resend : envoi des emails de votre compte (Irlande).",
              "Stripe : lecture des données de paiement de vos clients, si vous connectez Stripe.",
              "Google et GitHub : connexion à votre compte, si vous choisissez ce mode.",
            ]}
          />
          <p>Nous ne vendons ni ne louons jamais vos données.</p>
        </Section>

        <Section title="Combien de temps">
          <List
            items={[
              "Votre compte et les données de votre SaaS : tant que votre compte existe. Vous pouvez supprimer votre projet et ses données à tout moment, depuis Paramètres › Confidentialité.",
              "Les sauvegardes : 14 jours, puis elles sont effacées automatiquement.",
              "La newsletter : jusqu'à votre désinscription.",
            ]}
          />
        </Section>

        <Section title="Vos droits">
          <p>
            Vous pouvez à tout moment accéder à vos données, les corriger, les effacer, en demander
            une copie, ou vous opposer à un traitement. Écrivez-nous à{" "}
            <a className="font-semibold text-forest underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>{" "}
            : nous répondons sous un mois. Si notre réponse ne vous satisfait pas, vous pouvez
            saisir la CNIL (cnil.fr).
          </p>
        </Section>

        <Section title="Sécurité">
          <p>
            Connexions chiffrées (HTTPS), mots de passe jamais stockés en clair, cloisonnement
            strict des données entre les comptes au niveau de la base, et accès au serveur limité
            par clé. En cas de fuite de données vous concernant, nous vous prévenons et informons la
            CNIL dans les délais prévus par la loi.
          </p>
        </Section>
      </div>
    </article>
  );
}
