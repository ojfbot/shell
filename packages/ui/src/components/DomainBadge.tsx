export interface DomainBadgeProps {
  label: string | null
}

export function DomainBadge({ label }: DomainBadgeProps) {
  if (!label) return null

  return (
    <span className="shell-header__domain-badge" title={`Handled by ${label}`}>
      {label}
    </span>
  )
}
