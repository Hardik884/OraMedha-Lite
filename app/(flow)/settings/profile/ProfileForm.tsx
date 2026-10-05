"use client";

import { useState, useTransition } from "react";
import { BottomActions } from "@/components/layout/BottomActions";
import { Button } from "@/components/ui/button";
import { ChoiceList } from "@/components/ui/choice-list";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type SettingsResult } from "../actions";
import { isNavigationSignal } from "@/lib/navigation/signal";

type Values = { fullName: string; college: string; specialtyId: string };

export function ProfileForm({
  initial,
  specialties,
}: {
  initial: Values;
  specialties: { id: string; name: string }[];
}) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof Values, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const specialtyChanged = values.specialtyId !== initial.specialtyId;

  function save(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      let result: SettingsResult<keyof Values> | undefined;
      try {
        result = await updateProfile(values);
      } catch (error) {
        if (isNavigationSignal(error)) return;
        result = { formError: "Couldn't reach OraMedha. Check your internet and try again." };
      }
      if (result?.errors) setErrors(result.errors);
      if (result?.formError) setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={save} method="post" noValidate className="mx-auto max-w-lg space-y-5 px-4 pt-5 pb-32">
      <Field label="Your name" htmlFor="fullName" error={errors.fullName}>
        <Input
          id="fullName"
          autoComplete="name"
          autoCapitalize="words"
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          hasError={Boolean(errors.fullName)}
        />
      </Field>

      <Field label="College" htmlFor="college" error={errors.college}>
        <Input
          id="college"
          autoComplete="organization"
          autoCapitalize="words"
          value={values.college}
          onChange={(e) => set("college", e.target.value)}
          hasError={Boolean(errors.college)}
        />
      </Field>

      <div className="space-y-2">
        <Label>Specialty</Label>
        <ChoiceList
          label="Specialty"
          options={specialties.map((s) => ({ value: s.id, label: s.name }))}
          value={values.specialtyId}
          onChange={(id) => set("specialtyId", id)}
        />
        {errors.specialtyId && (
          <p className="text-sm text-danger" role="alert">
            {errors.specialtyId}
          </p>
        )}
        {specialtyChanged && (
          <p className="rounded-[10px] border border-info-border bg-info-bg px-3.5 py-3 text-sm text-info">
            New patients will use this specialty&apos;s case types. Your existing cases stay as they are.
          </p>
        )}
      </div>

      {formError && (
        <p className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger" role="alert">
          {formError}
        </p>
      )}

      <BottomActions>
        <Button type="submit" size="xl" block isLoading={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </BottomActions>
    </form>
  );
}
