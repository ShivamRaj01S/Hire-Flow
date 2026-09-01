import React from "react";
import { cn } from "./cn";

type Props = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: Props) {
  return (
    <label
      className={cn("text-sm font-medium text-slate-900", className)}
      {...props}
    />
  );
}

