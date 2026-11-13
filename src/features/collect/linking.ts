// Relier les clients payants (Stripe) à leur canal d'arrivée (script), sans configuration de
// plus que la ligne SaasClair : on compare l'empreinte de l'email du client Stripe à celle
// envoyée par l'identification (saasclair("identify", email)). Jamais d'email en clair.

export type FirstTouch = { email_hash: string; channel: string };
export type LinkableCustomer = { id: string; email_hash: string | null };

export type CustomerLinks = {
  /** Clients avec au moins un abonnement payant aujourd'hui. */
  paying: number;
  /** Parmi eux, ceux dont on connaît le canal d'arrivée. */
  linked: number;
  /** Part des clients payants reliés à leur provenance (%), affichée telle quelle. */
  coverage: number;
  /** Revenu mensuel des clients reliés, par canal d'arrivée. */
  byChannel: { id: string; name: string; customers: number; mrr: number }[];
};

export function linkCustomers(
  customerMrr: Record<string, number>,
  customers: LinkableCustomer[],
  touches: FirstTouch[],
  channelName: (id: string) => string = (id) => id,
): CustomerLinks {
  const channelOf = new Map(touches.map((touch) => [touch.email_hash, touch.channel]));
  const hashOf = new Map(customers.map((customer) => [customer.id, customer.email_hash]));
  const groups = new Map<string, { customers: number; mrr: number }>();
  let paying = 0;
  let linked = 0;
  for (const [customerId, mrr] of Object.entries(customerMrr)) {
    if (mrr <= 0) continue;
    paying += 1;
    const hash = hashOf.get(customerId);
    const channel = hash ? channelOf.get(hash) : undefined;
    if (!channel) continue;
    linked += 1;
    const group = groups.get(channel) ?? { customers: 0, mrr: 0 };
    group.customers += 1;
    group.mrr = Math.round((group.mrr + mrr) * 100) / 100;
    groups.set(channel, group);
  }
  return {
    paying,
    linked,
    coverage: paying ? Math.round((linked / paying) * 1000) / 10 : 0,
    byChannel: [...groups]
      .map(([id, group]) => ({ id, name: channelName(id), ...group }))
      .sort((a, b) => b.mrr - a.mrr),
  };
}
