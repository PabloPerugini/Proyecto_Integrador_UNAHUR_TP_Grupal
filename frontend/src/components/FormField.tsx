import type { InputHTMLAttributes, ReactNode } from 'react';
import { Form } from 'react-bootstrap';

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'value'> {
  label: string;
  hint?: string;
  error?: string;
  isInvalid?: boolean;
  control?: ReactNode;
  value?: string | number;
}

export default function FormField({ label, hint, error, isInvalid, control, id, ...rest }: FormFieldProps) {
  const fieldId = id ?? `ff-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const feedbackId = `${fieldId}-feedback`;
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
      <Form.Control
        id={fieldId}
        {...rest}
        isInvalid={isInvalid}
        aria-describedby={error ? feedbackId : undefined}
      />
      {error && <Form.Control.Feedback id={feedbackId} type="invalid">{error}</Form.Control.Feedback>}
      {hint && <Form.Text muted>{hint}</Form.Text>}
    </div>
  );
}