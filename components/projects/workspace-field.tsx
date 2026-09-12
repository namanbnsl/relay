import {
  cloneElement,
  useId,
  type ReactElement,
} from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const generatedId = useId();
  const id = children.props.id ?? generatedId;

  return (
    <div className="grid min-w-0 gap-2 text-sm">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
