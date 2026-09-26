"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice-list";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOnboarding, type OnboardingState } from "./actions";

type FormField = "fullName" | "college" | "specialtyId";

export function OnboardingForm({ specialties }: { specialties: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    saveOnboarding,
    {},
  );
  // Pre-select when there is only one choice: one less tap.
  const [specialtyId, setSpecialtyId] = useState<string | null>(
    state.values?.specialtyId || (specialties.length === 1 ? specialties[0]!.id : null),
  );

  // A field's error disappears as soon as the PG edits that field, instead of
  // lingering until the next submit. Tied to the `state` it was edited under,
  // so a fresh submit shows fresh errors.
  const [edited, setEdited] = useState<{ for: OnboardingState; fields: Set<FormField> }>({
    for: state,
    fields: new Set(),
  });
  const markEdited = (field: FormField) =>
    setEdited((prev) => ({
      for: state,
      fields: new Set(prev.for === state ? [...prev.fields, field] : [field]),
    }));
  const errorFor = (field: FormField) =>
    edited.for === state && edited.fields.has(field) ? undefined : state.errors?.[field];

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-6" noValidate>
      <Field label="Your name" htmlFor="fullName" error={errorFor("fullName")}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="Dr Riya Singh"
          defaultValue={state.values?.fullName}
          hasError={Boolean(errorFor("fullName"))}
          onChange={() => markEdited("fullName")}
        />
      </Field>

      <Field label="College" htmlFor="college" error={errorFor("college")}>
        <Input
          id="college"
          name="college"
          autoComplete="organization"
          autoCapitalize="words"
          placeholder="Your dental college"
          defaultValue={state.values?.college}
          hasError={Boolean(errorFor("college"))}
          onChange={() => markEdited("college")}
        />
      </Field>

      <div className="space-y-2">
        <Label>Your specialty</Label>
        <ChoiceList
          label="Your specialty"
          options={specialties.map((s) => ({ value: s.id, label: s.name }))}
          value={specialtyId}
          onChange={(id) => {
            setSpecialtyId(id);
            markEdited("specialtyId");
          }}
        />
        <input type="hidden" name="specialtyId" value={specialtyId ?? ""} />
        {errorFor("specialtyId") && (
          <p className="text-sm text-danger" role="alert">
            {errorFor("specialtyId")}
          </p>
        )}
        <p className="text-xs text-text-secondary">
          More specialties are coming soon.
        </p>
      </div>

      {state.formError && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {state.formError}
        </p>
      )}

      <div className="mt-auto pt-2">
        <Button type="submit" size="xl" block isLoading={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
