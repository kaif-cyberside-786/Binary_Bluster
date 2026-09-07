import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import WorkspaceLayout from './WorkspaceLayout';
import Card from '../components/Card';
import Button from '../components/Button';
import { StatusBadge } from '../components/Badge';

const CATEGORIES = [
  'Drinking Water',
  'Education',
  'Health & Family Welfare',
  'Roads & Bridges',
  'Sanitation',
  'Community Hall',
  'Rural Electrification',
  'Irrigation',
  'Sports Infrastructure',
  'Other Public Amenities',
];

export function MPWorkspace() {
  const { user, authFetch } = useAuth();
  const { tablePageSize } = usePreferences();

  const [dashboardData, setDashboardData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Recommendation modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: CATEGORIES[0],
    estimated_cost: '',
    description: '',
    block: '',
    gram_panchayat: '',
    village_ward: '',
  });

  // Project detail modal state
  const [selectedProject, setSelectedProject] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navItems = [
    { label: 'Constituency Dashboard', key: 'dashboard' },
    { label: 'My Recommendations', key: 'recs' },
    { label: 'Works Status Tracking', key: 'works' },
    { label: 'Financial & Allocation', key: 'finance' },
    { label: 'Attention Items', key: 'attention' },
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await authFetch('/api/dashboard/mp');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setDashboardData(body.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch MP dashboard:', err);
    }
  }, [authFetch]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await authFetch(`/api/projects?page=${page}&limit=${tablePageSize || 10}`);
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setProjects(body.data.items || []);
          setTotalPages(body.data.pagination?.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch MP projects:', err);
    }
  }, [authFetch, page, tablePageSize]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchDashboardData(), fetchProjects()]);
      } catch (err) {
        setError('Failed to load constituency data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [fetchDashboardData, fetchProjects]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitRecommendation = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.title.trim()) {
      setFormError('Work title is required.');
      return;
    }
    const costNum = Number(formData.estimated_cost);
    if (isNaN(costNum) || costNum <= 0) {
      setFormError('Estimated cost must be a positive number in Rupees (₹).');
      return;
    }
    if (formData.description.trim().length < 10) {
      setFormError('Detailed description must be at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        estimated_cost: costNum,
        description: formData.description.trim(),
        location: {
          block: formData.block.trim(),
          gram_panchayat: formData.gram_panchayat.trim(),
          village_ward: formData.village_ward.trim(),
        },
      };

      const res = await authFetch('/api/projects/recommendation', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to submit recommendation.');
      }

      // Success
      setShowModal(false);
      setFormData({
        title: '',
        category: CATEGORIES[0],
        estimated_cost: '',
        description: '',
        block: '',
        gram_panchayat: '',
        village_ward: '',
      });
      setSuccessMessage(`Recommendation submitted successfully! Project ID: ${body.data?.project?.project_id}`);
      setTimeout(() => setSuccessMessage(null), 6000);

      // Refresh data
      await Promise.all([fetchDashboardData(), fetchProjects()]);
    } catch (err) {
      setFormError(err.message || 'Submission error. Please check fields and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const mpInfo = dashboardData?.mp_info;
  const counts = dashboardData?.counts || {};
  const financial = dashboardData?.financial || {};
  const attention = dashboardData?.derived_attention;

  const constituency = mpInfo?.constituency || user?.jurisdiction?.constituency || 'Indore';
  const state = mpInfo?.state || user?.jurisdiction?.state || 'Madhya Pradesh';
  const allocatedCr = financial.allocated_amount
    ? (financial.allocated_amount / 10000000).toFixed(2)
    : '14.70';

  return (
    <WorkspaceLayout roleTitle="Hon'ble Member of Parliament" navItems={navItems}>
      {/* Alert Notices */}
      {successMessage && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#EAF6EC',
            color: 'var(--color-success)',
            border: '1px solid #B3DFBA',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-4)',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#FDECEB',
            color: 'var(--color-error)',
            border: '1px solid #F8B4AF',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* MP Identity & Action Bar */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
              Parliamentary Constituency • Lok Sabha
            </div>
            <h2 style={{ color: 'var(--color-primary)', marginTop: '2px', marginBottom: '4px' }}>
              {mpInfo?.mp_name || user?.full_name}
            </h2>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
              Constituency: <strong>{constituency}</strong> ({state}) • MP Identifier: <code>{mpInfo?.mp_id || user?.user_id}</code>
            </div>
          </div>

          <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
            + Recommend New Work
          </Button>
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Real Allocation Card */}
        <Card title="Constituency Allocation" subtitle={`MoSPI Official Data (${mpInfo?.year || '2024-2025'})`}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            ₹{allocatedCr} <span style={{ fontSize: '14px', fontWeight: 500 }}>Cr</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Annual Entitlement: <strong>₹5.00 Cr/Yr</strong>
          </div>
          {mpInfo?.is_real_government_data && (
            <div
              style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '2px 6px',
                backgroundColor: '#EDF4FC',
                color: 'var(--color-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              ✓ Real Government Record
            </div>
          )}
        </Card>

        {/* Total Recommendations Card */}
        <Card title="Total Works" subtitle="Lifecycle progression">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {counts.total || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Under Review: <strong>{counts.district_review || 0}</strong> • Sanctioned: <strong>{counts.sanctioned || 0}</strong>
          </div>
        </Card>

        {/* Sanctioned Outlay */}
        <Card title="Sanctioned Outlay" subtitle="Approved works value">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-success)' }}>
            ₹{((financial.total_sanctioned_cost || 0) / 100000).toFixed(2)} <span style={{ fontSize: '14px', fontWeight: 500 }}>Lakh</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '4px' }}>
            Estimated Value: ₹{((financial.total_estimated_cost || 0) / 100000).toFixed(2)} Lakh
          </div>
        </Card>

        {/* Completion Rate */}
        <Card title="Completion Rate" subtitle="Physical progress">
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-secondary)' }}>
            {dashboardData?.completion_rate || 0}%
          </div>
          <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${dashboardData?.completion_rate || 0}%`,
                height: '100%',
                backgroundColor: 'var(--color-secondary)',
              }}
            />
          </div>
        </Card>
      </div>

      {/* Attention Required Section (Derived from Project Status & AI Risk) */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Card title="Attention Required" subtitle="Items requiring MP review or clarification">
          {attention?.attention_count > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {attention.items.map((item) => (
                <div
                  key={item.project_id}
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: '#FFF8E6',
                    border: '1px solid #F2DC9B',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#8A6100', fontSize: 'var(--font-size-sm)' }}>
                      {item.project_id}: {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text)', marginTop: '2px' }}>
                      {item.reason}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', padding: 'var(--space-2) 0' }}>
              ✓ All recommended works are currently in normal progression. No pending clarification notices or held works.
            </div>
          )}
        </Card>
      </div>

      {/* My Recommendations Table */}
      <Card title="My Work Recommendations" subtitle="Submitted proposals and current review statuses">
        {loading ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading recommendations...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)' }}>
            <p style={{ marginBottom: 'var(--space-3)' }}>No recommendations submitted yet for this constituency.</p>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              + Submit First Recommendation
            </Button>
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: '#F8FAFC' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Project ID</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Work Title</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Category</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Estimated Cost</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Date</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Status</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.project_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{p.project_id}</td>
                      <td style={{ padding: '12px', maxWidth: '280px', fontWeight: 500 }}>{p.title}</td>
                      <td style={{ padding: '12px' }}>{p.category}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        ₹{(p.estimated_cost || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(p.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelectedProject(p)}
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)' }}>
                  Page {page} of {totalPages}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal: Recommend New Work */}
      {showModal && (
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
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div>
                <h3 style={{ color: 'var(--color-primary)', margin: 0 }}>Recommend New MPLADS Work</h3>
                <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                  Forward recommendation to District Authority ({constituency}, {state})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRecommendation} style={{ padding: 'var(--space-5)' }}>
              {formError && (
                <div
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: '#FDECEB',
                    color: 'var(--color-error)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-sm)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  ⚠ {formError}
                </div>
              )}

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '4px' }}>
                  Work Title <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Construction of Community Center at Gram Panchayat X"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '4px' }}>
                    Work Category <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '4px' }}>
                    Estimated Cost (₹) <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="estimated_cost"
                    value={formData.estimated_cost}
                    onChange={handleFormChange}
                    placeholder="e.g. 2500000"
                    min="1"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Block / Tehsil</label>
                  <input
                    type="text"
                    name="block"
                    value={formData.block}
                    onChange={handleFormChange}
                    placeholder="Block"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Gram Panchayat</label>
                  <input
                    type="text"
                    name="gram_panchayat"
                    value={formData.gram_panchayat}
                    onChange={handleFormChange}
                    placeholder="GP"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Village / Ward</label>
                  <input
                    type="text"
                    name="village_ward"
                    value={formData.village_ward}
                    onChange={handleFormChange}
                    placeholder="Ward"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '4px' }}>
                  Detailed Description & Public Utility Justification <span style={{ color: 'var(--color-error)' }}>*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={4}
                  placeholder="Describe the proposed public infrastructure work, beneficiary population, and community requirements..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit to District Collector'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Project Details */}
      {selectedProject && (
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
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '550px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 'var(--space-5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)' }}>PROJECT DETAIL</div>
                <h3 style={{ color: 'var(--color-primary)', margin: '2px 0 0 0' }}>{selectedProject.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
              <div>
                <strong>Project ID:</strong> <code>{selectedProject.project_id}</code>
              </div>
              <div>
                <strong>Status:</strong> <StatusBadge status={selectedProject.status} />
              </div>
              <div>
                <strong>Category:</strong> {selectedProject.category}
              </div>
              <div>
                <strong>Estimated Cost:</strong> ₹{(selectedProject.estimated_cost || 0).toLocaleString('en-IN')}
              </div>
              {selectedProject.sanctioned_cost && (
                <div>
                  <strong>Sanctioned Cost:</strong> ₹{selectedProject.sanctioned_cost.toLocaleString('en-IN')}
                </div>
              )}
              <div>
                <strong>District:</strong> {selectedProject.district}, {selectedProject.state}
              </div>
              <div>
                <strong>Recommended Date:</strong> {new Date(selectedProject.created_at).toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-5)', textAlign: 'right' }}>
              <Button size="sm" variant="secondary" onClick={() => setSelectedProject(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}

export default MPWorkspace;
