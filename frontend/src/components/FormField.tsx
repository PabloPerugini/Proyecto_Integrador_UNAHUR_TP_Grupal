import type { InputHTMLAttributes, ReactNode } from 'react';
import { Form } from 'react-bootstrap';

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'value'> {
  label: string;
  hint?: string;
  control?: ReactNode;
  value?: string | number;
}

export default function FormField({ label, hint, control, id, ...rest }: FormFieldProps) {
  const fieldId = id ?? `ff-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (control) {
    return (
      <div className="mb-3">
        <Form.Label htmlFor={fieldId} className="small fw-semibold">
          {label}
        </Form.Label>
        {control}
        {hint && <Form.Text muted>{hint}</Form.Text>}
      </div>
    );
  }
  return (
    <div className="mb-3">
      <Form.Label htmlFor={fieldId} className="small fw-semibold">
        {label}
      </Form.Label>
      <Form.Control id={fieldId} {...rest} />
      {hint && <Form.Text muted>{hint}</Form.Text>}
    </div>
  );
}