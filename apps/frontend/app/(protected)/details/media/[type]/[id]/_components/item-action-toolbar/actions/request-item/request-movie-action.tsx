"use client";

import { useState } from "react";
import { toast } from "sonner";

import { BaseItemAction } from "../_components/base-item-action";
import { useActionDialog } from "../_hooks/use-action-dialog";
import { requestItemClient } from "./_actions/request-item-client";
import { TriggerButton } from "./_components/trigger-button";

import type { BaseItemActionProps } from "../_components/base-item-action";
import type { ExternalIds } from "./_schemas/external-ids.schema";

type RequestMovieActionProps = Pick<BaseItemActionProps, "title"> & {
  externalIds: ExternalIds;
};

export function RequestMovieAction({
  title,
  externalIds,
}: RequestMovieActionProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const { isOpen, setIsOpen, callbacks } = useActionDialog({
    onSuccess() {
      toast.success("Request successful!");
    },
    onError() {
      toast.error("Request failed!");
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsExecuting(true);

    try {
      const result = await requestItemClient(externalIds);
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
      onOpenChange={setIsOpen}
      isExecuting={isExecuting}
      onSubmit={handleSubmit}
      title={`Requesting "${title}"`}
      description="This will send a request to Riven to add this media."
      slots={{
        content: (
          <div className="text-muted-foreground py-4 text-sm">
            This request will be approved automatically.
          </div>
        ),
        triggerButton: <TriggerButton label="Request" />,
        submitButtonLabel: "Request",
      }}
    />
  );
}
