import { useEffect } from 'react'
import { Button, Tag, InlineLoading } from '@carbon/react'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { fetchApprovals, approveHook, rejectHook } from '../store/slices/approvalQueueSlice.js'
import './ApprovalQueue.css'

export function ApprovalQueue() {
  const dispatch = useAppDispatch()
  const { items, loading } = useAppSelector(s => s.approvalQueue)

  useEffect(() => {
    dispatch(fetchApprovals())
    // Poll every 15s for new approvals
    const interval = setInterval(() => dispatch(fetchApprovals()), 15_000)
    return () => clearInterval(interval)
  }, [dispatch])

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
            <Button
              size="sm"
              kind="primary"
              onClick={() => { dispatch(approveHook(item.id)).then(() => dispatch(fetchApprovals())) }}
            >
              Approve
            </Button>
            <Button
              size="sm"
              kind="danger--ghost"
              onClick={() => { dispatch(rejectHook(item.id)).then(() => dispatch(fetchApprovals())) }}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
