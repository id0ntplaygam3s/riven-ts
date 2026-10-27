"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { BaseItemAction } from "../_components/base-item-action";
import { useActionDialog } from "../_hooks/use-action-dialog";
import { requestItemClient } from "./_actions/request-item-client";
import { SeasonSelector } from "./_components/season-selector";
import { TriggerButton } from "./_components/trigger-button";
import { RequestShowFormSchema } from "./_schemas/request-show.form-schema";

import type { BaseItemActionProps } from "../_components/base-item-action";
import type { ExternalIds } from "./_schemas/external-ids.schema";
import type { ComponentProps } from "react";

interface RequestShowActionProps extends Pick<BaseItemActionProps, "title"> {
  seasons: ComponentProps<typeof SeasonSelector>["seasons"];
  requestedSeasons: Set<number>;
  externalIds: ExternalIds;
}

export function RequestShowAction({
  title,
  externalIds,
  seasons,
  requestedSeasons,
}: RequestShowActionProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const { isOpen, setIsOpen, callbacks } = useActionDialog({
    onSuccess() {
      toast.success("Request successful!");
    },
    onError() {
      toast.error("Request failed!");
    },
  });

  const form = useForm({
    resolver: zodResolver(RequestShowFormSchema),
    defaultValues: {
      requestedSeasons: Object.fromEntries(
        [...requestedSeasons.values()].map((seasonNumber) => [
          seasonNumber.toString(),
          true,
        ]),
      ),
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = form.getValues();
    setIsExecuting(true);

    try {
      const result = await requestItemClient(
        externalIds,
        values.requestedSeasons,
      );
      if (result.success) {
        callbacks.onSuccess?.();
        setIsOpen(false);
      } else {
        callbacks.onError?.();
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <BaseItemAction
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
        }

        setIsOpen(open);
      }}
      isExecuting={isExecuting}
      onSubmit={handleSubmit}
      title={`Requesting "${title}"`}
      description="This will send a request to Riven to add this media."
      slots={{
        triggerButton: (
          <TriggerButton
            label={`Request ${requestedSeasons.size > 0 ? "more" : ""}`.trimEnd()}
          />
        ),
        content: (
          <FormProvider {...form}>
            <div className="my-4 space-y-2">
              <SeasonSelector
                seasons={seasons}
                requestedSeasons={requestedSeasons}
              />
            </div>
          </FormProvider>
        ),
        submitButtonLabel: "Request Selected",
      }}
    />
  );
}
