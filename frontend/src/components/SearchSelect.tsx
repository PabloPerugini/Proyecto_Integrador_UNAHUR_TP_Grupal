import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

export interface SearchSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  noResultsText?: string;
  ariaLabel?: string;
}

// Filtro insensible a mayúsculas y acentos (mismo criterio que el resto de la app).
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Select con búsqueda (equivalente liviano a react-select/Combobox, sin dependencias).
export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar…',
  disabled = false,
  clearable = true,
  noResultsText = 'Sin coincidencias.',
  ariaLabel,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter(
      (option) =>
        normalize(option.label).includes(q) ||
        (option.hint ? normalize(option.hint).includes(q) : false),
    );
  }, [options, query]);

  // Cerrado muestra el label elegido; abierto muestra lo que se escribe.
  const inputValue = open ? query : selected?.label ?? '';

  useEffect(() => {
    if (!open) return;
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) setActive(0);
  }, [open, query]);

  const pick = (option: SearchSelectOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault();
      setOpen(true);
      setQuery('');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[active];
      if (option) pick(option);
    } else if (event.key === 'Escape') {
      close();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="search-select" ref={rootRef}>
      <div className="search-select__control">
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {clearable && value && !disabled && (
          <button
            type="button"
            className="search-select__clear"
            aria-label="Limpiar selección"
            onClick={() => {
              onChange('');
              setQuery('');
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="search-select__list" role="listbox">
          {filtered.length === 0 && (
            <li className="search-select__empty">{noResultsText}</li>
          )}
          {filtered.slice(0, 200).map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`search-select__option${
                  index === active ? ' search-select__option--active' : ''
                }${option.value === value ? ' search-select__option--selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(option)}
                onMouseEnter={() => setActive(index)}
              >
                <span>{option.label}</span>
                {option.hint && (
                  <span className="search-select__hint">{option.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
