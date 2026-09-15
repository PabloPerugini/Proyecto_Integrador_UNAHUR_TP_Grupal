interface ColorDotProps {
  color: string;
  size?: number;
  className?: string;
  title?: string;
}

export default function ColorDot({ color, size = 12, className = '', title }: ColorDotProps) {
  return (
    <span
      className={`d-inline-block ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        ...(title ? { display: 'inline-block' } : {}),
      }}
      title={title}
      aria-hidden="true"
    />
  );
}