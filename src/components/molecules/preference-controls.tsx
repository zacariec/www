import { useId } from "react";

import type { ReactNode } from "react";

interface PreferenceWindowProps {
  title: string;
  note?: string;
  children: ReactNode;
  className?: string;
}

export function PreferenceWindow({ title, note, children, className = "" }: PreferenceWindowProps) {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className={`preference-window ${className}`}>
      <header className="preference-window__bar mono">
        <h2 id={heading}>{title}</h2>
        {note ? <span>{note}</span> : null}
      </header>
      {children}
    </section>
  );
}

interface PreferenceRowProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function PreferenceRow({ title, description, children }: PreferenceRowProps) {
  return (
    <div className="preference-row">
      <div className="preference-row__copy">
        <h3>{title}</h3>
        <p className="mono">{description}</p>
      </div>
      {children}
    </div>
  );
}

interface PreferenceToggleProps {
  label: string;
  checked: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

export function PreferenceToggle({
  label,
  checked,
  onChange,
  disabled = false,
}: PreferenceToggleProps) {
  return (
    <div className="preference-toggle mono">
      <span aria-hidden="true">{checked ? "on" : "off"}</span>
      <button
        aria-checked={checked}
        aria-label={label}
        className="preference-toggle__button"
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        role="switch"
        type="button"
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

interface PreferenceSegmentsProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function PreferenceSegments<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: PreferenceSegmentsProps<T>) {
  return (
    <div aria-label={label} className="preference-segments mono" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
