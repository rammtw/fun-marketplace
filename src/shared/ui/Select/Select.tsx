import { type SelectHTMLAttributes, useId } from 'react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Select({ label, hint, error, id, children, ...rest }: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <select
        id={fieldId}
        className={`${styles.input} ${error ? styles.invalid : ''}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  );
}
