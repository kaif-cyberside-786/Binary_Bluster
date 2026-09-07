import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Table from '../components/Table';

export function AdminUserManagement() {
  const { authFetch, user: currentAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    official_email: '',
    password: '',
    full_name: '',
    role: 'DISTRICT_AUTHORITY',
    designation: '',
    phone: '',
    jurisdictionLevel: 'DISTRICT',
    state: '',
    district: '',
    agency_name: '',
    constituency: '',
    house: 'Lok Sabha',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Status Toggle Modal State
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [statusToggling, setStatusToggling] = useState(false);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search.trim()) queryParams.set('search', search.trim());
      if (roleFilter) queryParams.set('role', roleFilter);
      if (statusFilter) queryParams.set('is_active', statusFilter);

      const res = await authFetch(`/api/admin/users?${queryParams.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(data.data.users || []);
        setPagination(data.data.pagination || { total: 0, totalPages: 1, limit: 10 });
      } else {
        setError(data.error?.message || 'Failed to load user registry.');
      }
    } catch (err) {
      setError('Network communication error while loading user registry.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle User Creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    // Hierarchy Validation per rules.md §6
    const level = formData.jurisdictionLevel;
    if (['STATE', 'DISTRICT', 'AGENCY'].includes(level) && !formData.state.trim()) {
      setCreateError(`State is mandatory for ${level} level jurisdiction.`);
      return;
    }
    if (['DISTRICT', 'AGENCY'].includes(level) && !formData.district.trim()) {
      setCreateError(`District is mandatory for ${level} level jurisdiction.`);
      return;
    }
    if (level === 'AGENCY' && !formData.agency_name.trim()) {
      setCreateError('Implementing Agency Name is mandatory for AGENCY level jurisdiction.');
      return;
    }

    const payload = {
      user_id: formData.user_id.trim().toUpperCase(),
      official_email: formData.official_email.trim().toLowerCase(),
      password: formData.password,
      full_name: formData.full_name.trim(),
      role: formData.role,
      designation: formData.designation.trim() || 'Officer',
      phone: formData.phone.trim() || undefined,
      jurisdiction: {
        level: formData.jurisdictionLevel,
        state: formData.state.trim() || undefined,
        district: formData.district.trim() || undefined,
        agency_name: formData.agency_name.trim() || undefined,
        constituency: formData.constituency.trim() || undefined,
        house: formData.role === 'MP' ? formData.house : undefined,
      },
    };

    setCreateSubmitting(true);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowCreateModal(false);
        setSuccessMsg(`User ${payload.user_id} (${payload.full_name}) created successfully.`);
        // Reset form
        setFormData({
          user_id: '',
          official_email: '',
          password: '',
          full_name: '',
          role: 'DISTRICT_AUTHORITY',
          designation: '',
          phone: '',
          jurisdictionLevel: 'DISTRICT',
          state: '',
          district: '',
          agency_name: '',
          constituency: '',
          house: 'Lok Sabha',
        });
        fetchUsers();
      } else {
        setCreateError(data.error?.message || 'Failed to create user.');
      }
    } catch (err) {
      setCreateError('Network failure while registering user.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Status Toggle (Activate / Deactivate)
  const handleToggleStatus = async () => {
    if (!statusModalUser) return;
    setStatusToggling(true);
    try {
      const targetStatus = !statusModalUser.is_active;
      const res = await authFetch(`/api/admin/users/${statusModalUser.user_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: targetStatus }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(
          `User ${statusModalUser.user_id} has been ${targetStatus ? 'activated' : 'deactivated'} successfully.`
        );
        setStatusModalUser(null);
        fetchUsers();
      } else {
        setError(data.error?.message || 'Failed to update account status.');
      }
    } catch (err) {
      setError('Network communication error.');
    } finally {
      setStatusToggling(false);
    }
  };

  // Table columns definition
  const tableColumns = [
    {
      header: 'User ID',
      key: 'user_id',
      width: '130px',
      render: (val) => <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{val}</span>,
    },
    {
      header: 'Officer Name & Email',
      key: 'full_name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{val}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{row.official_email}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      key: 'role',
      render: (val) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: val === 'ADMIN' ? '#FEE2E2' : '#EDF4FC',
            color: val === 'ADMIN' ? 'var(--color-danger)' : 'var(--color-primary)',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      header: 'Designation',
      key: 'designation',
      render: (val) => val || '—',
    },
    {
      header: 'Jurisdiction',
      key: 'jurisdiction',
      render: (val) => {
        if (!val) return '—';
        const parts = [];
        if (val.agency_name) parts.push(val.agency_name);
        if (val.constituency) parts.push(val.constituency);
        if (val.district) parts.push(val.district);
        if (val.state) parts.push(val.state);
        return parts.length > 0 ? parts.join(', ') : val.level || 'NATIONAL';
      },
    },
    {
      header: 'Status',
      key: 'is_active',
      align: 'center',
      render: (val) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: val ? '#EAF6EC' : '#FEE2E2',
            color: val ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          {val ? 'ACTIVE' : 'DEACTIVATED'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, row) => {
        const isSelf = row.user_id === currentAdmin?.user_id;
        return (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <Button
              size="sm"
              variant={row.is_active ? 'sensitive' : 'secondary'}
              disabled={isSelf}
              title={isSelf ? 'Cannot deactivate your own administrator account' : undefined}
              onClick={() => setStatusModalUser(row)}
            >
              {row.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* Admin Isolation Banner (§5.32 & rules.md §10) */}
      <div
        style={{
          backgroundColor: '#FFF8E6',
          border: '1px solid #F2DC9B',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '20px', color: '#8A6100' }}>🛡</span>
        <div style={{ fontSize: 'var(--font-size-sm)', color: '#8A6100', lineHeight: 1.5 }}>
          <strong>System Administrator Isolation Architecture:</strong> Per Government security directive and{' '}
          <code>rules.md §10</code>, this workspace is strictly confined to user account provisioning, role management,
          and system telemetry. Risk scores, AI recommendation findings, project decisions, and audit trail records are
          cryptographically isolated and never accessible from Administrator accounts.
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          role="status"
          style={{
            backgroundColor: '#EAF6EC',
            border: '1px solid #B3DFBA',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-success)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>✔ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#FDE8E8',
            border: '1px solid #F87171',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-danger)',
            marginBottom: 'var(--space-4)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* User Directory Management Card */}
      <Card
        title="Official User Directory"
        subtitle="Manage authenticated users, roles, and administrative jurisdictions"
        headerAction={
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            + Provision New User
          </Button>
        }
      >
        {/* Filters and Search Bar */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 'var(--space-4)',
            backgroundColor: '#F8FAFC',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by User ID, Name, or Email..."
              style={{
                width: '100%',
                height: '36px',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={{
                height: '36px',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <option value="">All Roles</option>
              <option value="MP">MP</option>
              <option value="DISTRICT_AUTHORITY">District Authority</option>
              <option value="IMPLEMENTING_AGENCY">Implementing Agency</option>
              <option value="STATE_NODAL_OFFICER">State Nodal Officer</option>
              <option value="MINISTRY_OFFICER">Ministry Officer</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">System Admin</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                height: '36px',
                padding: '0 var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Deactivated Only</option>
            </select>
          </div>

          <Button size="sm" variant="secondary" onClick={fetchUsers}>
            Refresh
          </Button>
        </div>

        {/* User Table */}
        <Table
          columns={tableColumns}
          data={users}
          isLoading={loading}
          emptyMessage="No official users found matching the selected filters."
          pagination={{
            from: (pagination.page - 1) * pagination.limit + 1,
            to: Math.min(pagination.page * pagination.limit, pagination.total),
            total: pagination.total,
            currentPage: pagination.page || page,
            totalPages: pagination.totalPages || 1,
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(pagination.totalPages, p + 1)),
          }}
        />
      </Card>

      {/* Provision User Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-6)',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase' }}>
              Administrator Provisioning
            </div>
            <h3 id="create-user-modal-title" style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
              Provision New Official User
            </h3>

            {createError && (
              <div
                role="alert"
                style={{
                  backgroundColor: '#FDE8E8',
                  border: '1px solid #F87171',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                ⚠ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label htmlFor="modal-user-id" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    User ID <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="modal-user-id"
                    type="text"
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    placeholder="e.g. USR-DIST-02"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="modal-email" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Official Email <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="modal-email"
                    type="email"
                    required
                    value={formData.official_email}
                    onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                    placeholder="e.g. dm.bhopal@gov.in"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label htmlFor="modal-name" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Full Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Shri Rajesh Kumar"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="modal-password" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Initial Password <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="modal-password"
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 8 chars, mixed case & symbol"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label htmlFor="modal-role" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    System Role <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <select
                    id="modal-role"
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      let newLevel = 'DISTRICT';
                      if (newRole === 'ADMIN' || newRole === 'MINISTRY_OFFICER' || newRole === 'AUDITOR') newLevel = 'NATIONAL';
                      if (newRole === 'STATE_NODAL_OFFICER') newLevel = 'STATE';
                      if (newRole === 'MP') newLevel = 'CONSTITUENCY';
                      if (newRole === 'IMPLEMENTING_AGENCY') newLevel = 'AGENCY';

                      setFormData({
                        ...formData,
                        role: newRole,
                        jurisdictionLevel: newLevel,
                      });
                    }}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    <option value="MP">MP</option>
                    <option value="DISTRICT_AUTHORITY">District Authority</option>
                    <option value="IMPLEMENTING_AGENCY">Implementing Agency</option>
                    <option value="STATE_NODAL_OFFICER">State Nodal Officer</option>
                    <option value="MINISTRY_OFFICER">Ministry Officer</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-designation" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Designation
                  </label>
                  <input
                    id="modal-designation"
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. District Magistrate"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                </div>
              </div>

              {/* Jurisdiction Fields */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  marginTop: '4px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Jurisdiction Scope
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label htmlFor="modal-jurisdiction-level" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Jurisdiction Level
                    </label>
                    <select
                      id="modal-jurisdiction-level"
                      value={formData.jurisdictionLevel}
                      onChange={(e) => setFormData({ ...formData, jurisdictionLevel: e.target.value })}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 var(--space-3)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                    >
                      <option value="NATIONAL">NATIONAL</option>
                      <option value="STATE">STATE</option>
                      <option value="DISTRICT">DISTRICT</option>
                      <option value="CONSTITUENCY">CONSTITUENCY</option>
                      <option value="AGENCY">AGENCY</option>
                    </select>
                  </div>

                  {['STATE', 'DISTRICT', 'AGENCY', 'CONSTITUENCY'].includes(formData.jurisdictionLevel) && (
                    <div>
                      <label htmlFor="modal-state" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        State <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        id="modal-state"
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Madhya Pradesh"
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      />
                    </div>
                  )}

                  {['DISTRICT', 'AGENCY'].includes(formData.jurisdictionLevel) && (
                    <div>
                      <label htmlFor="modal-district" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        District <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        id="modal-district"
                        type="text"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        placeholder="e.g. Indore"
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      />
                    </div>
                  )}

                  {formData.jurisdictionLevel === 'AGENCY' && (
                    <div>
                      <label htmlFor="modal-agency-name" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Implementing Agency Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        id="modal-agency-name"
                        type="text"
                        value={formData.agency_name}
                        onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                        placeholder="e.g. Rural Engineering Services (RES)"
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      />
                    </div>
                  )}

                  {formData.role === 'MP' && (
                    <div>
                      <label htmlFor="modal-constituency" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Constituency
                      </label>
                      <input
                        id="modal-constituency"
                        type="text"
                        value={formData.constituency}
                        onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                        placeholder="e.g. Indore Parliamentary Constituency"
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={createSubmitting}>
                  Provision User Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Status Toggle (Deactivate / Activate) */}
      {statusModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-status-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            zIndex: 1000,
          }}
          onClick={() => setStatusModalUser(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: 'var(--space-6)',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="toggle-status-modal-title" style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>
              Confirm Account {statusModalUser.is_active ? 'Deactivation' : 'Activation'}
            </h3>

            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
              Are you sure you want to {statusModalUser.is_active ? 'deactivate' : 'activate'} user{' '}
              <strong>{statusModalUser.user_id}</strong> ({statusModalUser.full_name})?
              {statusModalUser.is_active && (
                <span style={{ display: 'block', marginTop: '6px', color: 'var(--color-danger)' }}>
                  Active tokens will be rejected and the user will immediately lose access to the portal.
                </span>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="sm" onClick={() => setStatusModalUser(null)}>
                Cancel
              </Button>
              <Button
                variant={statusModalUser.is_active ? 'sensitive' : 'primary'}
                size="sm"
                isLoading={statusToggling}
                onClick={handleToggleStatus}
              >
                Confirm {statusModalUser.is_active ? 'Deactivation' : 'Activation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagement;

