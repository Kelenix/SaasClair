/** En-tête des écrans de l'espace administrateur : titre, explication courte, actions. */
export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="mb-2 text-[30px] sm:text-[36px]">{title}</h1>
        <p className="text-[16px] text-slate">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
