import React, { useState, useEffect } from 'react';
import {
  User, Mail, Building, Phone, Hash, Lock, FolderTree,
  ChevronDown, CheckCircle, AlertCircle, AlertTriangle,
  Loader, RefreshCw, MessageSquare, Info, Eye, EyeOff
} from 'lucide-react';
import { userApi, adApi } from '../services/api';
import ConfirmationModal from './ConfirmationModal';

// ── Styles ────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
  },
  sidebar: {
    width: '200px',
    borderRight: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    padding: '16px 0',
    flexShrink: 0,
    overflowY: 'auto',
  },
  sidebarSection: {
    padding: '4px 0',
    marginBottom: '4px',
  },
  sidebarLabel: {
    padding: '6px 16px',
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  sidebarItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
    background: active ? 'rgba(61, 107, 196, 0.08)' : 'transparent',
    borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
    transition: 'all 120ms ease',
  }),
  form: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  formInner: {
    maxWidth: '780px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border)',
  },
  sectionIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sectionDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  required: {
    color: 'var(--text-error)',
    fontSize: '11px',
  },
  autoBadge: {
    fontSize: '10px',
    padding: '1px 6px',
    borderRadius: '10px',
    background: 'rgba(61, 107, 196, 0.1)',
    border: '1px solid var(--border-focus)',
    color: 'var(--text-accent)',
    fontFamily: 'var(--font-mono)',
  },
  inputWrap: {
    position: 'relative',
  },
  inputError: {
    border: '1px solid var(--border-error)',
    boxShadow: '0 0 0 2px rgba(196, 75, 61, 0.1)',
  },
  inputValid: {
    border: '1px solid var(--border-success)',
  },
  errMsg: {
    fontSize: '11px',
    color: 'var(--text-error)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  passwordWrap: {
    position: 'relative',
    display: 'flex',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    color: 'var(--text-muted)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    padding: '2px',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    cursor: 'pointer',
    transition: 'all 120ms ease',
  },
  toggleKnob: (on) => ({
    width: '32px',
    height: '18px',
    borderRadius: '9px',
    background: on ? 'var(--accent)' : 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    position: 'relative',
    transition: 'all 120ms ease',
    flexShrink: 0,
  }),
  toggleThumb: (on) => ({
    position: 'absolute',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#fff',
    top: '2px',
    left: on ? '16px' : '2px',
    transition: 'left 120ms ease',
  }),
  validationPanel: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
  },
  errorItem: {
    display: 'flex',
    gap: '8px',
    padding: '6px 0',
    fontSize: '13px',
    color: 'var(--text-error)',
    borderBottom: '1px solid var(--border)',
  },
  warnItem: {
    display: 'flex',
    gap: '8px',
    padding: '6px 0',
    fontSize: '13px',
    color: 'var(--text-warn)',
  },
  autoGenItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  footer: {
    display: 'flex',
    gap: '10px',
    paddingTop: '8px',
    paddingBottom: '32px',
  },
  btn: {
    primary: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '11px 22px',
      borderRadius: '9px',
      background: 'var(--accent)',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 500,
      border: '1px solid var(--accent)',
      cursor: 'pointer',
    },
    secondary: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '11px 18px',
      borderRadius: '9px',
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      fontSize: '14px',
      border: '1px solid var(--border)',
      cursor: 'pointer',
    },
    ghost: {
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      padding: '11px 18px',
      borderRadius: '9px',
      background: 'transparent',
      color: 'var(--text-secondary)',
      fontSize: '14px',
      border: '1px solid var(--border)',
      cursor: 'pointer',
    },
  },
  successBanner: {
    padding: '14px 16px',
    borderRadius: '10px',
    background: 'rgba(30, 100, 60, 0.1)',
    border: '1px solid var(--border-success)',
    color: 'var(--text-success)',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    fontSize: '14px',
    animation: 'fadeIn 0.3s ease',
  },
};

const SECTIONS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'account', label: 'Account', icon: Lock },
  { id: 'location', label: 'Location', icon: FolderTree },
  { id: 'profile', label: 'Profile', icon: Building },
  { id: 'contact', label: 'Contact', icon: Phone },
];

const INITIAL_FORM = {
  first_name: '', last_name: '', display_name: '', username: '',
  user_principal_name: '', password: '', ou_path: '',
  email: '', department: '', job_title: '', phone: '',
  // mobile: '',
   company: '', employee_id: '', manager_dn: '',
  description: '', account_status: 'enabled',
  must_change_password: true, password_never_expires: false,
};

function Field({ label, required, autoGen, error, children }) {
  return (
    <div style={s.field}>
      <label style={s.label}>
        {label}
        {required && <span style={s.required}>*</span>}
        {autoGen && <span style={s.autoBadge}>auto</span>}
      </label>
      {children}
      {error && (
        <div style={s.errMsg}>
          <AlertCircle size={11} />
          {error}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, value, onChange, description }) {
  return (
    <div style={{ ...s.toggle, borderColor: value ? 'var(--border-focus)' : 'var(--border)' }}
      onClick={() => onChange(!value)}
    >
      <div style={s.toggleKnob(value)}>
        <div style={s.toggleThumb(value)} />
      </div>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{description}</div>}
      </div>
    </div>
  );
}

export default function FormInterface({ onSwitchToChat }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [ous, setOUs] = useState([]);
  const [activeSection, setActiveSection] = useState('identity');
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Fetch OUs on load
  useEffect(() => {
    adApi.getOUs().then(res => setOUs(res.ous || [])).catch(() => {});
  }, []);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear result on edit
    if (result) setResult(null);
    if (validation) setValidation(null);
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidation(null);
    setFieldErrors({});
    try {
      const res = await userApi.validate(form);
      setValidation(res);
      // Map errors to fields (best-effort)
      const errs = {};
      (res.errors || []).forEach(e => {
        if (e.toLowerCase().includes('first name')) errs.first_name = e;
        else if (e.toLowerCase().includes('last name')) errs.last_name = e;
        else if (e.toLowerCase().includes('username')) errs.username = e;
        else if (e.toLowerCase().includes('password')) errs.password = e;
        else if (e.toLowerCase().includes('email')) errs.email = e;
        else if (e.toLowerCase().includes('ou') || e.toLowerCase().includes('path')) errs.ou_path = e;
        else if (e.toLowerCase().includes('upn') || e.toLowerCase().includes('principal')) errs.user_principal_name = e;
      });
      setFieldErrors(errs);
    } catch (err) {
      setValidation({ is_valid: false, errors: [err.message], warnings: [], auto_generated: {} });
    } finally {
      setValidating(false);
    }
  };

  const handleAnalyze = async () => {
    setValidating(true);
    try {
      const res = await userApi.analyze(form);
      setAnalysis(res);
      setShowConfirm(true);
    } catch (err) {
      setValidation(prev => ({ ...prev, errors: [...(prev?.errors || []), err.message] }));
    } finally {
      setValidating(false);
    }
  };

  const handleApprove = async () => {
    setCreating(true);
    try {
      const res = await userApi.create(form);
      setResult(res);
      setShowConfirm(false);
      if (res.success) {
        // Update form with any auto-generated values
        if (analysis?.validation?.auto_generated) {
          setForm(prev => ({ ...prev, ...analysis.validation.auto_generated }));
        }
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
      setShowConfirm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setValidation(null);
    setAnalysis(null);
    setResult(null);
    setFieldErrors({});
  };

  const autoGen = validation?.auto_generated || {};
  const hasErrors = validation && !validation.is_valid;

  return (
    <div style={s.root}>
      {/* Sidebar Nav */}
      <nav style={s.sidebar}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <div key={id}
            style={s.sidebarItem(activeSection === id)}
            onClick={() => {
              setActiveSection(id);
              document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <Icon size={14} />
            {label}
          </div>
        ))}
      </nav>

      {/* Form */}
      <div style={s.form}>
        <div style={s.formInner}>

          {/* Success Banner */}
          {result?.success && (
            <div style={s.successBanner}>
              <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>User Created Successfully</div>
                <div style={{ fontSize: '13px', opacity: 0.85 }}>{result.message}</div>
                {result.user_dn && (
                  <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', marginTop: '4px', opacity: 0.7 }}>
                    DN: {result.user_dn}
                  </div>
                )}
                {result.dry_run && (
                  <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-warn)' }}>
                    ⚠ Dry run — no actual changes made to Active Directory
                  </div>
                )}
              </div>
            </div>
          )}

          {result && !result.success && (
            <div style={{ ...s.successBanner,
              background: 'rgba(100, 30, 30, 0.1)',
              border: '1px solid var(--border-error)',
              color: 'var(--text-error)'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600 }}>Creation Failed</div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>{result.message}</div>
              </div>
            </div>
          )}

          {/* ── SECTION: Identity ── */}
          <div id="section-identity" style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionIcon}><User size={14} color="var(--text-accent)" /></div>
              <div>
                <div style={s.sectionTitle}>Identity</div>
                <div style={s.sectionDesc}>Core name and login information</div>
              </div>
            </div>
            <div style={s.grid2}>
              <Field label="First Name" required error={fieldErrors.first_name}>
                <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                  placeholder="Jane" style={fieldErrors.first_name ? s.inputError : undefined} />
              </Field>
              <Field label="Last Name" required error={fieldErrors.last_name}>
                <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                  placeholder="Doe" style={fieldErrors.last_name ? s.inputError : undefined} />
              </Field>
            </div>
            <div style={s.grid2}>
              <Field label="Display Name" autoGen={!form.display_name && !!autoGen.display_name}>
                <input value={form.display_name || autoGen.display_name || ''}
                  onChange={e => set('display_name', e.target.value)}
                  placeholder="Jane Doe (auto-generated)" />
              </Field>
              <Field label="Username (sAMAccountName)" autoGen={!form.username && !!autoGen.username}
                error={fieldErrors.username}>
                <input value={form.username || autoGen.username || ''}
                  onChange={e => set('username', e.target.value)}
                  placeholder="jane.doe (auto-generated)"
                  style={{ fontFamily: 'var(--font-mono)', ...(fieldErrors.username ? s.inputError : {}) }}
                />
              </Field>
            </div>
            <Field label="User Principal Name (UPN)" autoGen={!form.user_principal_name && !!autoGen.user_principal_name}
              error={fieldErrors.user_principal_name}>
              <input value={form.user_principal_name || autoGen.user_principal_name || ''}
                onChange={e => set('user_principal_name', e.target.value)}
                placeholder="jane.doe@company.com (auto-generated)"
                style={{ fontFamily: 'var(--font-mono)', ...(fieldErrors.user_principal_name ? s.inputError : {}) }}
              />
            </Field>
          </div>

          {/* ── SECTION: Account ── */}
          <div id="section-account" style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionIcon}><Lock size={14} color="var(--text-accent)" /></div>
              <div>
                <div style={s.sectionTitle}>Account</div>
                <div style={s.sectionDesc}>Password and account settings</div>
              </div>
            </div>
            <Field label="Initial Password" required error={fieldErrors.password}>
              <div style={s.passwordWrap}>
                <input type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Set initial password"
                  style={{ paddingRight: '40px', ...(fieldErrors.password ? s.inputError : {}) }}
                />
                <button style={s.eyeBtn} onClick={() => setShowPassword(!showPassword)} type="button">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
            <div style={s.grid2}>
              <Field label="Account Status">
                <select value={form.account_status} onChange={e => set('account_status', e.target.value)}>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Toggle
                label="Must change password on first login"
                value={form.must_change_password}
                onChange={v => set('must_change_password', v)}
                description="Recommended: user sets their own password"
              />
              <Toggle
                label="Password never expires"
                value={form.password_never_expires}
                onChange={v => set('password_never_expires', v)}
                description="Not recommended for regular users"
              />
            </div>
          </div>

          {/* ── SECTION: Location ── */}
          <div id="section-location" style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionIcon}><FolderTree size={14} color="var(--text-accent)" /></div>
              <div>
                <div style={s.sectionTitle}>Location in Active Directory</div>
                <div style={s.sectionDesc}>Which Organizational Unit (OU) to place the user in</div>
              </div>
            </div>
            <Field label="Organizational Unit (OU)" required error={fieldErrors.ou_path}>
              <select value={form.ou_path} onChange={e => set('ou_path', e.target.value)}
                style={fieldErrors.ou_path ? s.inputError : undefined}>
                <option value="">— Select OU —</option>
                {ous.map(ou => (
                  <option key={ou.dn} value={ou.dn}>{ou.name} — {ou.dn}</option>
                ))}
              </select>
            </Field>
            <Field label="Or enter OU path manually">
              <input value={form.ou_path}
                onChange={e => set('ou_path', e.target.value)}
                placeholder="OU=IT,DC=company,DC=com"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
            </Field>
            <Field label="Manager DN (optional)">
              <input value={form.manager_dn} onChange={e => set('manager_dn', e.target.value)}
                placeholder="CN=John Smith,OU=IT,DC=company,DC=com"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
            </Field>
          </div>

          {/* ── SECTION: Profile ── */}
          <div id="section-profile" style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionIcon}><Building size={14} color="var(--text-accent)" /></div>
              <div>
                <div style={s.sectionTitle}>Profile</div>
                <div style={s.sectionDesc}>Department, job title, company details</div>
              </div>
            </div>
            <div style={s.grid2}>
              <Field label="Department">
                <input value={form.department} onChange={e => set('department', e.target.value)}
                  placeholder="Information Technology" />
              </Field>
              <Field label="Job Title">
                <input value={form.job_title} onChange={e => set('job_title', e.target.value)}
                  placeholder="Software Engineer" />
              </Field>
            </div>
            <div style={s.grid2}>
              <Field label="Company">
                <input value={form.company} onChange={e => set('company', e.target.value)}
                  placeholder="Acme Corp" />
              </Field>
              <Field label="Employee ID">
                <input value={form.employee_id} onChange={e => set('employee_id', e.target.value)}
                  placeholder="EMP-001234" />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Optional account description" rows={2} />
            </Field>
          </div>

          {/* ── SECTION: Contact ── */}
          <div id="section-contact" style={s.section}>
            <div style={s.sectionHeader}>
              <div style={s.sectionIcon}><Phone size={14} color="var(--text-accent)" /></div>
              <div>
                <div style={s.sectionTitle}>Contact</div>
                <div style={s.sectionDesc}>Email and phone information</div>
              </div>
            </div>
            <Field label="Email Address" error={fieldErrors.email}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="jane.doe@company.com"
                style={fieldErrors.email ? s.inputError : undefined}
              />
            </Field>
            <div style={s.grid2}>
              <Field label="Phone">
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000" />
              </Field>
              {/* <Field label="Mobile">
                <input value={form.mobile} onChange={e => set('mobile', e.target.value)}
                  placeholder="+1 (555) 000-0001" />
              </Field> */}
            </div>
          </div>

          {/* ── Validation Panel ── */}
          {validation && (
            <div style={s.validationPanel}>
              {/* Auto-generated fields info */}
              {Object.keys(autoGen).length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-accent)',
                    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                    Auto-generated fields
                  </div>
                  {Object.entries(autoGen).map(([k, v]) => (
                    <div key={k} style={s.autoGenItem}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{k}</span>
                      <span style={{ color: 'var(--text-accent)', fontFamily: 'var(--font-mono)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {validation.errors?.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-error)',
                    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                    {validation.errors.length} Error{validation.errors.length > 1 ? 's' : ''} found
                  </div>
                  {validation.errors.map((e, i) => (
                    <div key={i} style={s.errorItem}>
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                      {e}
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {validation.warnings?.length > 0 && (
                <div>
                  {validation.warnings.map((w, i) => (
                    <div key={i} style={s.warnItem}>
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Valid */}
              {validation.is_valid && (
                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-success)', fontSize: '13px' }}>
                  <CheckCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                  All validations passed. Ready to proceed.
                </div>
              )}
            </div>
          )}

          {/* ── Footer Buttons ── */}
          <div style={s.footer}>
            <button style={s.btn.ghost} onClick={onSwitchToChat}>
              <MessageSquare size={15} />
              Ask AI
            </button>
            <button style={s.btn.secondary} onClick={handleReset}>
              <RefreshCw size={15} />
              Reset
            </button>
            <button style={s.btn.secondary} onClick={handleValidate} disabled={validating}>
              {validating
                ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                : <CheckCircle size={15} />
              }
              {validating ? 'Validating...' : 'Validate'}
            </button>
            <button
              style={{
                ...s.btn.primary,
                opacity: (!validation?.is_valid) ? 0.5 : 1,
                cursor: (!validation?.is_valid) ? 'not-allowed' : 'pointer',
              }}
              onClick={handleAnalyze}
              disabled={!validation?.is_valid || validating}
            >
              {validating
                ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                : <Info size={15} />
              }
              Review & Create
            </button>
          </div>

        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && analysis && (
        <ConfirmationModal
          analysis={analysis}
          onApprove={handleApprove}
          onEdit={() => setShowConfirm(false)}
          onReject={() => { setShowConfirm(false); setAnalysis(null); }}
          loading={creating}
        />
      )}
    </div>
  );
}
