import { Button, Tag, InlineLoading } from '@carbon/react'

export interface ApprovalItem {
  id: string
  title: string
  labels: Record<string, string>
}

export interface ApprovalQueueProps {
  items: ApprovalItem[]
  loading: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function ApprovalQueue({ items, loading, onApprove, onReject }: ApprovalQueueProps) {
  if (!loading && items.length === 0) return null

  return (
    <div className="approval-queue" role="complementary" aria-label="Approval queue">
      <div className="approval-queue__header">
        <span className="approval-queue__label">Needs action</span>
        {loading && <InlineLoading />}
      </div>
      {items.map(item => (
        <div key={item.id} className="approval-queue__item">
          <div className="approval-queue__item-info">
            <Tag size="sm" type="blue">{item.labels['role'] ?? 'agent'}</Tag>
            <span className="approval-queue__item-title">{item.title}</span>
            <span className="approval-queue__item-hook">{item.labels['hook'] ?? ''}</span>
          </div>
          <div className="approval-queue__item-actions">
            <Button size="sm" kind="primary" onClick={() => onApprove(item.id)}>
              Approve
            </Button>
            <Button size="sm" kind="danger--ghost" onClick={() => onReject(item.id)}>
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
