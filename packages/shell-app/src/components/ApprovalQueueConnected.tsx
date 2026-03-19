/**
 * Connects the pure @ojfbot/shell ApprovalQueue to the Redux store.
 * Handles polling and dispatch — the pure component is prop-only.
 */
import { useEffect } from 'react'
import { ApprovalQueue } from '@ojfbot/shell'
import { useAppDispatch, useAppSelector } from '../store/hooks.js'
import { fetchApprovals, approveHook, rejectHook } from '../store/slices/approvalQueueSlice.js'

export function ApprovalQueueConnected() {
  const dispatch = useAppDispatch()
  const { items, loading } = useAppSelector(s => s.approvalQueue)

  useEffect(() => {
    dispatch(fetchApprovals())
    const interval = setInterval(() => dispatch(fetchApprovals()), 15_000)
    return () => clearInterval(interval)
  }, [dispatch])

  return (
    <ApprovalQueue
      items={items}
      loading={loading}
      onApprove={id => { dispatch(approveHook(id)).then(() => dispatch(fetchApprovals())) }}
      onReject={id => { dispatch(rejectHook(id)).then(() => dispatch(fetchApprovals())) }}
    />
  )
}
