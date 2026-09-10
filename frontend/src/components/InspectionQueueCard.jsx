import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from './Card';
import Button from './Button';
import { StatusBadge, RiskBadge, ComplianceBadge } from './Badge';

/**
 * PriorityBadge: strictly displays Inspection Priority (Phase 13),
 * distinct from Phase 9 AI Risk Score per Section 2 of Phase 13 specification.
 */
export function PriorityBadge({ priority, score }) {
  let bg = '#EDF2F7';
  let color = '#4A5568';
  let border = '#CBD5E0';

  const p = (priority || 'ROUTINE').toUpperCase();
  if (p === 'URGENT') {
    bg = '#FFF5F5';
    color = '#9B2C2C';
    border = '#FEB2B2';
  } else if (p === 'HIGH') {
    bg = '#FFFAF0';
    color = '#9C4221';
    border = '#FBD38D';
  } else if (p === 'MEDIUM') {
    bg = '#EBF8FF';
    color = '#2B6CB0';
    border = '#BEE3F8';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        letterSpacing: '0.02em',
      }}
      title={`Inspection Priority: ${p} (Priority Score: ${score || 0}/100)`}
    >
      <span>{p}</span>
      {typeof score === 'number' && <span style={{ opacity: 0.8, fontSize: '10px' }}>({score})</span>}
    </span>
  );
}

/**
 * InspectionStatusBadge: Canonical 7-stage lifecycle display
 */
export function InspectionStatusBadge({ status }) {
  let bg = '#F7FAFC';
  let color = '#4A5568';
  let border = '#E2E8F0';

  const s = (status || 'RECOMMENDED').toUpperCase();
  switch (s) {
    case 'RECOMMENDED':
      bg = '#EDF2F7';
      color = '#2D3748';
      border = '#CBD5E0';
      break;
    case 'PENDING_DECISION':
      bg = '#FEFCBF';
      color = '#744210';
      border = '#FAF089';
      break;
    case 'ASSIGNED':
      bg = '#EBF8FF';
      color = '#2B6CB0';
      border = '#90CDF4';
      break;
    case 'SCHEDULED':
      bg = '#FAF5FF';
      color = '#553C9A';
      border = '#D6BCFA';
      break;
    case 'IN_PROGRESS':
      bg = '#E6FFFA';
      color = '#234E52';
      border = '#81E6D9';
      break;
    case 'COMPLETED':
      bg = '#F0FFF4';
      color = '#22543D';
      border = '#9AE6B4';
      break;
    case 'RESULT_RECORDED':
      bg = '#C6F6D5';
      color = '#1C4532';
      border = '#68D391';
      break;
    default:
      break;
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
      }}
    >
      {s.replace(/_/g, ' ')}
    </span>
  );
}

/**
 * InspectionQueueCard Component — Phase 13
 * Reusable for District and State Workspaces.
 */
export default function InspectionQueueCard({
  title = 'Risk-Ranked Field Inspection Queue',
  subtitle = 'Prioritized candidates for physical verification based on risk, compliance & execution signals',
  defaultDistrict = null,
  readOnly = false,
  onOpenProjectDetail = null,
}) {
  const { user, authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [queueItems, setQueueItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [assignModalItem, setAssignModalItem] = useState(null);
  const [assignOfficerId, setAssignOfficerId] = useState('');
  const [assignOfficerName, setAssignOfficerName] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const [scheduleModalItem, setScheduleModalItem] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  const [resultModalItem, setResultModalItem] = useState(null);
  const [resultOutcome, setResultOutcome] = useState('NO_ISSUE');
  const [resultFindings, setResultFindings] = useState('');
  const [resultRemarks, setResultRemarks] = useState('');
  const [resultSubmitting, setResultSubmitting] = useState(false);

  const isDistrictAuthority = user?.role === 'DISTRICT_AUTHORITY';
  const isStateNodal = user?.role === 'STATE_NODAL_AUTHORITY';
  const canModify = !readOnly && isDistrictAuthority;

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/inspections?limit=50';
      if (statusFilter && statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (priorityFilter && priorityFilter !== 'ALL') url += `&priority=${priorityFilter}`;
      if (defaultDistrict) url += `&district=${encodeURIComponent(defaultDistrict)}`;

      const res = await authFetch(url);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to load inspection queue');
      }
      setQueueItems(body.data?.items || []);
    } catch (err) {
      setError(err.message || 'Error fetching inspection queue');
    } finally {
      setLoading(false);
    }
  }, [authFetch, statusFilter, priorityFilter, defaultDistrict]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle Action: Ensure inspection exists or recommend first
  const ensureInspection = async (item) => {
    if (item.inspection_id) return item.inspection_id;
    // Auto-recommend on-the-fly if authorized officer clicks action
    const res = await authFetch('/api/inspections/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: item.project_id,
        source: 'OFFICER_RECOMMENDATION',
        reason: 'Officer prioritized from field verification queue',
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error?.message || 'Failed to initialize inspection record');
    }
    return body.data?.inspection_id;
  };

  // Submit Officer Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignOfficerId.trim()) {
      setError('Officer ID is required');
      return;
    }
    setAssignSubmitting(true);
    try {
      const inspId = await ensureInspection(assignModalItem);
      const res = await authFetch(`/api/inspections/${inspId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_officer_id: assignOfficerId.trim(),
          assigned_officer_name: assignOfficerName.trim() || assignOfficerId.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to assign officer');
      }
      setAssignModalItem(null);
      setSuccessMessage(`Officer ${assignOfficerName || assignOfficerId} assigned successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Submit Schedule Date
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleDate) {
      setError('Inspection date is required');
      return;
    }
    setScheduleSubmitting(true);
    try {
      const inspId = await ensureInspection(scheduleModalItem);
      const res = await authFetch(`/api/inspections/${inspId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SCHEDULED',
          scheduled_date: scheduleDate,
          notes: scheduleNotes.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to schedule inspection');
      }
      setScheduleModalItem(null);
      setSuccessMessage(`Inspection scheduled for ${scheduleDate}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Transition status (e.g. IN_PROGRESS or COMPLETED)
  const handleTransitionStatus = async (item, targetStatus) => {
    try {
      const inspId = await ensureInspection(item);
      const res = await authFetch(`/api/inspections/${inspId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          reason: `Transitioned by ${user?.full_name || user?.user_id}`,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || `Failed to transition to ${targetStatus}`);
      }
      setSuccessMessage(`Inspection moved to ${targetStatus.replace(/_/g, ' ')}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchQueue();
    } catch (err) {
      setError(err.message);
    }
  };

  // Submit Result Recording
  const handleResultSubmit = async (e) => {
    e.preventDefault();
    if (!resultFindings.trim()) {
      setError('Substantive inspection findings are required');
      return;
    }
    setResultSubmitting(true);
    try {
      const inspId = resultModalItem.inspection_id;
      const res = await authFetch(`/api/inspections/${inspId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: resultOutcome,
          findings: resultFindings.trim(),
          remarks: resultRemarks.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to record inspection result');
      }
      setResultModalItem(null);
      setSuccessMessage(`Result recorded as '${resultOutcome}'. Audit log updated.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setResultSubmitting(false);
    }
  };

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      <Card title={title} subtitle={subtitle}>
        {/* Messages */}
        {error && (
          <div
            style={{
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              backgroundColor: '#FFF5F5',
              border: '1px solid #FEB2B2',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {error}
          </div>
        )}
        {successMessage && (
          <div
            style={{
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              backgroundColor: '#F0FFF4',
              border: '1px solid #9AE6B4',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-success)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
            paddingBottom: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>
              Status:
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  marginLeft: '6px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                }}
              >
                <option value="ALL">All Lifecycle Stages</option>
                <option value="RECOMMENDED">Recommended</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="RESULT_RECORDED">Result Recorded</option>
              </select>
            </label>

            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>
              Inspection Priority:
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  marginLeft: '6px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent (≥75)</option>
                <option value="HIGH">High (50–74)</option>
                <option value="MEDIUM">Medium (25–49)</option>
                <option value="ROUTINE">Routine (&lt;25)</option>
              </select>
            </label>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
            Total Candidates: <strong>{queueItems.length}</strong>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading inspection queue...
          </div>
        ) : queueItems.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            No inspection recommendations currently require action.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)' }}>
                    Project & District
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)' }}>
                    Inspection Priority
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)' }}>
                    Risk & Compliance
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)' }}>
                    Execution Telemetry
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)' }}>
                    Lifecycle Status
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-muted)' }}>
                    Officer / Date
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-muted)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item) => (
                  <tr
                    key={item.project_id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Project & District */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--color-secondary)',
                            cursor: onOpenProjectDetail ? 'pointer' : 'default',
                          }}
                          onClick={() => onOpenProjectDetail && onOpenProjectDetail(item.project_id)}
                          title="View 360 Details"
                        >
                          {item.project_id}
                        </span>
                        <StatusBadge status={item.project_status} />
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--color-text)',
                          marginTop: '2px',
                          maxWidth: '240px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.project_title}
                      >
                        {item.project_title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        {item.district}, {item.state}
                      </div>
                    </td>

                    {/* Inspection Priority (Section 2 distinction) */}
                    <td style={{ padding: '10px 12px' }}>
                      <PriorityBadge priority={item.priority} score={item.priority_score} />
                      <div style={{ fontSize: '10px', color: 'var(--color-muted)', marginTop: '4px' }}>
                        Source: {item.recommendation_source.replace(/_/g, ' ')}
                      </div>
                    </td>

                    {/* Risk & Compliance */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <RiskBadge level={item.risk_level} score={item.risk_score} />
                      </div>
                      <ComplianceBadge status={item.compliance_severity} />
                    </td>

                    {/* Execution Telemetry */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--color-text)' }}>
                        Phys: <strong>{item.physical_percent}%</strong> • Fin: <strong>{item.financial_percent}%</strong>
                      </div>
                      {item.discrepancy_gap > 0 && (
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: item.discrepancy_gap >= 15 ? 'var(--color-error)' : 'var(--color-warning)',
                            marginTop: '2px',
                          }}
                        >
                          Gap: {item.discrepancy_gap}%
                        </div>
                      )}
                    </td>

                    {/* Lifecycle Status */}
                    <td style={{ padding: '10px 12px' }}>
                      <InspectionStatusBadge status={item.inspection_status} />
                      {item.result && (
                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color:
                              item.result === 'NO_ISSUE'
                                ? 'var(--color-success)'
                                : item.result === 'REVIEW_REQUIRED'
                                ? 'var(--color-warning)'
                                : 'var(--color-error)',
                          }}
                        >
                          Result: {item.result}
                        </div>
                      )}
                    </td>

                    {/* Officer / Schedule */}
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                      {item.assigned_officer_name ? (
                        <div>
                          <strong>{item.assigned_officer_name}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--color-muted)' }}>
                            {item.assigned_officer_id}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                      {item.scheduled_date && (
                        <div style={{ fontSize: '11px', color: 'var(--color-secondary)', marginTop: '2px' }}>
                          📅 {new Date(item.scheduled_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap' }}>
                        {canModify && (
                          <>
                            {/* Assign Officer button */}
                            {['RECOMMENDED', 'PENDING_DECISION', 'ASSIGNED'].includes(item.inspection_status) && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setAssignModalItem(item);
                                  setAssignOfficerId(item.assigned_officer_id || '');
                                  setAssignOfficerName(item.assigned_officer_name || '');
                                }}
                              >
                                {item.assigned_officer_id ? 'Re-assign' : 'Assign'}
                              </Button>
                            )}

                            {/* Schedule Date button */}
                            {['ASSIGNED', 'SCHEDULED'].includes(item.inspection_status) && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setScheduleModalItem(item);
                                  setScheduleDate(
                                    item.scheduled_date ? new Date(item.scheduled_date).toISOString().split('T')[0] : ''
                                  );
                                }}
                              >
                                {item.scheduled_date ? 'Reschedule' : 'Schedule'}
                              </Button>
                            )}

                            {/* Start Visit button */}
                            {item.inspection_status === 'SCHEDULED' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleTransitionStatus(item, 'IN_PROGRESS')}
                              >
                                Start Visit
                              </Button>
                            )}

                            {/* Complete Visit button */}
                            {item.inspection_status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleTransitionStatus(item, 'COMPLETED')}
                              >
                                Complete Visit
                              </Button>
                            )}

                            {/* Record Result button */}
                            {item.inspection_status === 'COMPLETED' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setResultModalItem(item);
                                  setResultOutcome('NO_ISSUE');
                                  setResultFindings('');
                                  setResultRemarks('');
                                }}
                              >
                                Record Result
                              </Button>
                            )}
                          </>
                        )}

                        {onOpenProjectDetail && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenProjectDetail(item.project_id)}
                          >
                            360 View
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL 1: Assign Officer */}
      {assignModalItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Assign Field Inspection Officer</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
              Project: <strong>{assignModalItem.project_id}</strong> ({assignModalItem.project_title})
            </p>

            <form onSubmit={handleAssignSubmit}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Officer User ID:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USR-DIST-01 or FO-INDORE-02"
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Officer Full Name (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shri Rajesh Sharma, Executive Engineer"
                  value={assignOfficerName}
                  onChange={(e) => setAssignOfficerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button type="button" variant="secondary" onClick={() => setAssignModalItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={assignSubmitting}>
                  {assignSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Schedule Inspection */}
      {scheduleModalItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Schedule Field Inspection Visit</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
              Project: <strong>{scheduleModalItem.project_id}</strong>
            </p>

            <form onSubmit={handleScheduleSubmit}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Scheduled Date:
                </label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Instructions / Notes (Optional):
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Inspect foundation depth, verify steel delivery, test concrete samples"
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button type="button" variant="secondary" onClick={() => setScheduleModalItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={scheduleSubmitting}>
                  {scheduleSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Record Result */}
      {resultModalItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-6)',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>Record Official Field Inspection Result</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
              Project: <strong>{resultModalItem.project_id}</strong> • Inspection: <strong>{resultModalItem.inspection_id}</strong>
            </p>

            <form onSubmit={handleResultSubmit}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Inspection Finding Result:
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="resultOutcome"
                      value="NO_ISSUE"
                      checked={resultOutcome === 'NO_ISSUE'}
                      onChange={() => setResultOutcome('NO_ISSUE')}
                    />
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>NO ISSUE</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="resultOutcome"
                      value="REVIEW_REQUIRED"
                      checked={resultOutcome === 'REVIEW_REQUIRED'}
                      onChange={() => setResultOutcome('REVIEW_REQUIRED')}
                    />
                    <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>REVIEW REQUIRED</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="resultOutcome"
                      value="ESCALATE"
                      checked={resultOutcome === 'ESCALATE'}
                      onChange={() => setResultOutcome('ESCALATE')}
                    />
                    <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>ESCALATE</span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Substantive Findings Summary (Required):
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Document physical site observations, material quality, adherence to approved DPR specifications, measurements, and any deviations observed."
                  value={resultFindings}
                  onChange={(e) => setResultFindings(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Administrative Remarks / Next Steps (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Issue rectification notice to implementing agency within 7 days"
                  value={resultRemarks}
                  onChange={(e) => setResultRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button type="button" variant="secondary" onClick={() => setResultModalItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={resultSubmitting}>
                  {resultSubmitting ? 'Recording...' : 'Record Official Result'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

