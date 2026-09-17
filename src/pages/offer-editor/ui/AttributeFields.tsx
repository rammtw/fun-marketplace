import type { AttributeDraft, AttributeField } from 'pages/offer-editor/lib/attribute-schema';
import { Select } from 'shared/ui/Select';
import { TextField } from 'shared/ui/TextField';

interface AttributeFieldsProps {
  fields: AttributeField[];
  draft: AttributeDraft;
  errors: Record<string, string>;
  onChange: (name: string, value: string | boolean) => void;
}

/** Поля лота рисуются по схеме раздела, а не хардкодом под конкретную игру. */
export function AttributeFields({ fields, draft, errors, onChange }: AttributeFieldsProps) {
  return (
    <>
      {fields.map((field) => {
        const label = `${field.name}${field.required ? ' *' : ''}`;
        const value = draft[field.name];

        if (field.type === 'bool') {
          return (
            <label key={field.name}>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(event) => onChange(field.name, event.target.checked)}
              />{' '}
              {field.name}
            </label>
          );
        }

        if (field.type === 'enum') {
          return (
            <Select
              key={field.name}
              label={label}
              value={typeof value === 'string' ? value : ''}
              error={errors[field.name]}
              onChange={(event) => onChange(field.name, event.target.value)}
            >
              <option value="">— не выбрано —</option>
              {field.values.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {String(option)}
                </option>
              ))}
            </Select>
          );
        }

        return (
          <TextField
            key={field.name}
            label={label}
            type={field.type === 'int' ? 'number' : 'text'}
            value={typeof value === 'string' ? value : ''}
            error={errors[field.name]}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        );
      })}
    </>
  );
}
