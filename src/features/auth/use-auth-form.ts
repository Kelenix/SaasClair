"use client";

import { startTransition, useActionState, useState } from "react";
import type { z } from "zod";
import type { AuthState } from "./actions";

type Shape = Record<string, z.ZodType>;

/**
 * Formulaire d'accès : validation en temps réel (après la première sortie du champ), puis
 * envoi à l'action serveur, qui revalide tout. Les erreurs serveur s'effacent dès qu'on corrige.
 */
export function useAuthForm<S extends Shape>(
  schema: z.ZodObject<S>,
  action: (state: AuthState, formData: FormData) => Promise<AuthState>,
) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [edited, setEdited] = useState<Record<string, boolean>>({});

  const clientError = (name: string) => {
    const result = schema.shape[name].safeParse(values[name] ?? "");
    return result.success ? undefined : result.error.issues[0]?.message;
  };

  const errorOf = (name: string) =>
    (touched[name] ? clientError(name) : undefined) ??
    (edited[name] ? undefined : state.fieldErrors?.[name]);

  const field = (name: keyof S & string) => ({
    name,
    value: values[name] ?? "",
    error: errorOf(name),
    isValid: Boolean(touched[name] && values[name] && !clientError(name)),
    onChange: (value: string) => {
      setValues((current) => ({ ...current, [name]: value }));
      setEdited((current) => ({ ...current, [name]: true }));
    },
    onBlur: () =>
      setTouched((current) => ({ ...current, [name]: Boolean(values[name]) || current[name] })),
  });

  // Les formulaires sont en method="post" : si l'envoi part avant que React ne l'intercepte,
  // le navigateur fait un POST, jamais un GET avec le mot de passe dans l'adresse.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setTouched(Object.fromEntries(Object.keys(schema.shape).map((name) => [name, true])));
    setEdited({});
    if (Object.keys(schema.shape).some((name) => clientError(name))) return;
    startTransition(() => formAction(formData));
  };

  return { state, isPending, field, onSubmit };
}
