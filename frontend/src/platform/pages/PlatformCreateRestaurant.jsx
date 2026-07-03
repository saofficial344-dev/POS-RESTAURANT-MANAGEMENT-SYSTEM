import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import platformAPI from '../services/platformApi';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, Check, Copy, Eye, EyeOff,
  Building2, Star, SlidersHorizontal, User, ClipboardList,
  CheckCircle2, Globe, Clock, DollarSign, ChevronDown,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Restaurant Info',    icon: Building2 },
  { id: 2, label: 'Plan & Billing',     icon: Star },
  { id: 3, label: 'Limits & Features',  icon: SlidersHorizontal },
  { id: 4, label: 'Admin Account',      icon: User },
  { id: 5, label: 'Review & Create',    icon: ClipboardList },
];

const BUSINESS_TYPES = [
  { value: 'restaurant',     label: 'Restaurant' },
  { value: 'cafe',           label: 'Cafe' },
  { value: 'hotel',          label: 'Hotel' },
  { value: 'bakery',         label: 'Bakery' },
  { value: 'food_truck',     label: 'Food Truck' },
  { value: 'cloud_kitchen',  label: 'Cloud Kitchen' },
  { value: 'other',          label: 'Other' },
];

const TIMEZONES = [
  'Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata',
  'Asia/Dhaka',   'Europe/London', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

const CURRENCIES = ['PKR', 'USD', 'AED', 'SAR', 'GBP', 'EUR', 'INR', 'BDT', 'SGD'];

const FEATURE_META = [
  { key: 'inventory',       label: 'Inventory Tracking',  desc: 'Real-time stock management' },
  { key: 'advancedReports', label: 'Advanced Reports',    desc: 'Deep analytics & export' },
  { key: 'apiAccess',       label: 'API Access',          desc: 'Third-party integrations' },
  { key: 'multiBranch',     label: 'Multi Branch',        desc: 'Manage multiple locations' },
  { key: 'loyalty',         label: 'Loyalty Program',     desc: 'Customer points & rewards' },
  { key: 'delivery',        label: 'Delivery Module',     desc: 'Delivery order management' },
  { key: 'kitchenDisplay',  label: 'Kitchen Display',     desc: 'KDS for kitchen staff' },
  { key: 'analytics',       label: 'Analytics',           desc: 'Business intelligence' },
  { key: 'customDomain',    label: 'Custom Domain',       desc: 'Branded portal URL' },
  { key: 'prioritySupport', label: 'Priority Support',    desc: '24/7 dedicated support' },
  { key: 'multipleAdmins',  label: 'Multiple Admins',     desc: 'Multiple admin accounts' },
  { key: 'exportData',      label: 'Data Export',         desc: 'Export to CSV/Excel' },
];

const BLANK_FEATURES = Object.fromEntries(FEATURE_META.map(f => [f.key, false]));

function featuresFromPlan(plan) {
  if (!plan?.features) return BLANK_FEATURES;
  return {
    inventory:       plan.features.inventory       ?? false,
    advancedReports: plan.features.advancedReports ?? false,
    apiAccess:       plan.features.apiAccess       ?? false,
    multiBranch:     plan.features.multiBranch     ?? false,
    loyalty:         plan.features.loyalty         ?? false,
    delivery:        plan.features.delivery        ?? true,
    kitchenDisplay:  plan.features.kitchenDisplay  ?? true,
    analytics:       plan.features.analytics       ?? false,
    customDomain:    plan.features.customDomain    ?? false,
    prioritySupport: plan.features.prioritySupport ?? false,
    multipleAdmins:  plan.features.multipleAdmins  ?? false,
    exportData:      plan.features.exportData      ?? false,
  };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

const Label = ({ children, required }) => (
  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
    {children} {required && <span className="text-red-500 normal-case font-normal">*</span>}
  </label>
);

const Input = ({ label, required, className = '', ...props }) => (
  <div className={className}>
    {label && <Label required={required}>{label}</Label>}
    <input
      {...props}
      className="w-full h-10 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-gray-600"
    />
  </div>
);

const Select = ({ label, required, children, className = '', ...props }) => (
  <div className={className}>
    {label && <Label required={required}>{label}</Label>}
    <select
      {...props}
      className="w-full h-10 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3.5 text-sm outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
    >
      {children}
    </select>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-200 focus:outline-none ${
      checked ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-700 border-gray-700'
    }`}
  >
    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 mt-px ${
      checked ? 'translate-x-4' : 'translate-x-0.5'
    }`} />
  </button>
);

const SectionHeader = ({ children }) => (
  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 pb-2 border-b border-gray-700/50">
    {children}
  </h3>
);

// ── Step 1: Restaurant Info ───────────────────────────────────────────────────

function Step1({ form, setForm }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <SectionHeader>Restaurant Details</SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Restaurant Name" required
          placeholder="e.g. Spice Garden"
          value={form.name}
          onChange={e => f('name', e.target.value)}
          className="sm:col-span-2"
        />
        <Select label="Business Type" value={form.businessType} onChange={e => f('businessType', e.target.value)}>
          {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </Select>
        <Input
          label="Owner / Business Name"
          placeholder="Legal entity name"
          value={form.ownerName}
          onChange={e => f('ownerName', e.target.value)}
        />
        <Input
          label="Contact Email"
          type="email"
          placeholder="contact@restaurant.com"
          value={form.email}
          onChange={e => f('email', e.target.value)}
        />
        <Input
          label="Phone"
          placeholder="+92 300 000 0000"
          value={form.phone}
          onChange={e => f('phone', e.target.value)}
        />
      </div>

      <SectionHeader>Location</SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Address"
          placeholder="Street address"
          value={form.address}
          onChange={e => f('address', e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="City"
          placeholder="Karachi"
          value={form.city}
          onChange={e => f('city', e.target.value)}
        />
        <Input
          label="Country"
          placeholder="Pakistan"
          value={form.country}
          onChange={e => f('country', e.target.value)}
        />
        <Select label="Timezone" value={form.timezone} onChange={e => f('timezone', e.target.value)}>
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </Select>
        <Select label="Currency" value={form.currency} onChange={e => f('currency', e.target.value)}>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
    </div>
  );
}

// ── Step 2: Plan & Billing ────────────────────────────────────────────────────

function Step2({ form, setForm, plans, loadingPlans, onPlanSelect }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const selectedPlan = plans.find(p => p.slug === form.planSlug);

  return (
    <div className="space-y-6">
      {/* Billing cycle toggle */}
      <div className="flex items-center gap-3">
        <SectionHeader>Billing Cycle</SectionHeader>
        <div className="flex bg-gray-800 border border-gray-700 rounded-xl p-1 ml-auto mb-4">
          {['monthly', 'yearly'].map(cycle => (
            <button key={cycle} type="button"
              onClick={() => f('billingCycle', cycle)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                form.billingCycle === cycle
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}>
              {cycle}
              {cycle === 'yearly' && <span className="ml-1.5 text-[10px] text-green-400 font-bold">SAVE 20%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <SectionHeader>Select Plan <span className="text-red-500 normal-case font-normal">*</span></SectionHeader>
      {loadingPlans ? (
        <div className="flex items-center justify-center h-32 text-gray-600 text-sm">Loading plans…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map(plan => {
            const price = form.billingCycle === 'yearly'
              ? plan.price?.yearly
              : plan.price?.monthly;
            const isSelected = form.planSlug === plan.slug;
            return (
              <button key={plan.slug} type="button"
                onClick={() => onPlanSelect(plan)}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}>
                {plan.badge && (
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 mb-2">
                    {plan.badge}
                  </span>
                )}
                <p className="font-black text-white text-base">{plan.displayName || plan.name}</p>
                <p className="text-2xl font-black text-white mt-1">
                  {price === 0 ? 'Free' : `${plan.price?.currency || 'PKR'} ${price?.toLocaleString()}`}
                  {price > 0 && <span className="text-sm font-normal text-gray-500">/{form.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
                </p>
                <div className="mt-3 text-xs text-gray-500 space-y-0.5">
                  <p>{plan.limits?.branches ?? '—'} branches</p>
                  <p>{plan.limits?.staff ?? '—'} staff members</p>
                  <p>{plan.limits?.tables ?? '—'} tables</p>
                </div>
                {isSelected && (
                  <div className="mt-3 flex items-center gap-1 text-indigo-400 text-xs font-bold">
                    <CheckCircle2 size={13} /> Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Trial days */}
      <SectionHeader>Trial Period</SectionHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Trial Days"
          type="number"
          min="0" max="365"
          placeholder={`Default: ${selectedPlan?.trialDays ?? 14} days`}
          value={form.trialDays}
          onChange={e => f('trialDays', e.target.value)}
        />
        <Input
          label="Subscription Start Date"
          type="date"
          value={form.subscriptionStart}
          onChange={e => f('subscriptionStart', e.target.value)}
        />
      </div>
    </div>
  );
}

// ── Step 3: Limits & Features ─────────────────────────────────────────────────

function Step3({ form, setForm, selectedPlan }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const ft = (k, v) => setForm(p => ({ ...p, features: { ...p.features, [k]: v } }));

  return (
    <div className="space-y-6">
      <SectionHeader>Resource Limits</SectionHeader>
      <p className="text-xs text-gray-600 -mt-4 mb-2">
        Leave blank to use plan defaults ({selectedPlan?.limits?.branches ?? '?'} branches, {selectedPlan?.limits?.staff ?? '?'} staff).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Max Branches"
          type="number" min="1"
          placeholder={String(selectedPlan?.limits?.branches ?? '')}
          value={form.maxBranches}
          onChange={e => f('maxBranches', e.target.value)}
        />
        <Input
          label="Max Staff Members"
          type="number" min="1"
          placeholder={String(selectedPlan?.limits?.staff ?? '')}
          value={form.maxUsers}
          onChange={e => f('maxUsers', e.target.value)}
        />
      </div>

      <SectionHeader>Feature Flags</SectionHeader>
      <p className="text-xs text-gray-600 -mt-4 mb-2">
        Initialized from selected plan. Toggle to override for this restaurant.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURE_META.map(({ key, label, desc }) => (
          <div key={key} className="flex items-start justify-between gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div>
              <p className="text-sm font-semibold text-gray-300">{label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
            </div>
            <Toggle
              checked={form.features[key] ?? false}
              onChange={v => ft(key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Admin Account ─────────────────────────────────────────────────────

function Step4({ form, setForm }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-5">
      <SectionHeader>Admin Login Credentials</SectionHeader>
      <p className="text-xs text-gray-500 -mt-3 mb-3">
        A temporary password will be auto-generated. Share credentials securely with the restaurant owner.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Admin Username" required
          placeholder="e.g. spicegarden_admin"
          value={form.adminName}
          onChange={e => f('adminName', e.target.value)}
        />
        <Input
          label="Admin Email"
          type="email"
          placeholder="admin@spicegarden.com"
          value={form.adminEmail}
          onChange={e => f('adminEmail', e.target.value)}
        />
      </div>

      <SectionHeader>Default Branch</SectionHeader>
      <Input
        label="Default Branch Name"
        placeholder={form.name ? `${form.name} — Main Branch` : 'Main Branch'}
        value={form.defaultBranchName}
        onChange={e => f('defaultBranchName', e.target.value)}
      />

      <SectionHeader>Internal Notes</SectionHeader>
      <div>
        <Label>Notes (internal only)</Label>
        <textarea
          rows={3}
          placeholder="Any internal notes about this restaurant (not visible to the restaurant)…"
          value={form.notes}
          onChange={e => f('notes', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-gray-600 resize-none"
        />
      </div>
    </div>
  );
}

// ── Step 5: Review ────────────────────────────────────────────────────────────

function Step5({ form, selectedPlan }) {
  const Row = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-700/30 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-200 text-right font-medium">{value || '—'}</span>
    </div>
  );

  const enabledFeatures = FEATURE_META.filter(f => form.features[f.key]).map(f => f.label);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Restaurant */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Restaurant</p>
          <Row label="Name"          value={form.name} />
          <Row label="Business Type" value={form.businessType} />
          <Row label="Owner"         value={form.ownerName} />
          <Row label="Email"         value={form.email} />
          <Row label="Phone"         value={form.phone} />
          <Row label="City"          value={form.city} />
          <Row label="Country"       value={form.country} />
          <Row label="Timezone"      value={form.timezone} />
          <Row label="Currency"      value={form.currency} />
        </div>

        {/* Plan */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Subscription</p>
          <Row label="Plan"         value={selectedPlan?.displayName || selectedPlan?.name} />
          <Row label="Billing"      value={form.billingCycle} />
          <Row label="Trial Days"   value={form.trialDays || String(selectedPlan?.trialDays ?? 14)} />
          <Row label="Max Branches" value={form.maxBranches || String(selectedPlan?.limits?.branches ?? '—')} />
          <Row label="Max Staff"    value={form.maxUsers || String(selectedPlan?.limits?.staff ?? '—')} />

          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4 mb-2">Admin</p>
          <Row label="Username"     value={form.adminName} />
          <Row label="Admin Email"  value={form.adminEmail} />
          <Row label="Branch Name"  value={form.defaultBranchName || (form.name ? `${form.name} — Main Branch` : 'Main Branch')} />
        </div>
      </div>

      {/* Features */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Enabled Features</p>
        {enabledFeatures.length === 0 ? (
          <p className="text-xs text-gray-600">No features enabled</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {enabledFeatures.map(f => (
              <span key={f} className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-semibold border border-indigo-500/20">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-400">
        <strong>Before you create:</strong> A temporary password will be generated automatically and shown only once. Make sure to copy and share it securely with the restaurant owner.
      </div>
    </div>
  );
}

// ── Credentials Modal ─────────────────────────────────────────────────────────

function CredentialsModal({ creds, onClose }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState({});

  const copy = async (key, value) => {
    await navigator.clipboard.writeText(value).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  };

  const CopyBtn = ({ k, value }) => (
    <button type="button" onClick={() => copy(k, value)}
      className="ml-2 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-all">
      {copied[k] ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg">Restaurant Created!</h3>
              <p className="text-xs text-gray-500">Save these credentials now — password shown only once</p>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="p-6 space-y-4">
          {/* Username */}
          <div className="bg-gray-800 rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Username</p>
            <div className="flex items-center justify-between">
              <p className="text-white font-mono text-sm">{creds.username}</p>
              <CopyBtn k="username" value={creds.username} />
            </div>
          </div>

          {/* Password */}
          <div className="bg-gray-800 rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Temporary Password</p>
            <div className="flex items-center justify-between">
              <p className="text-white font-mono text-sm tracking-widest">
                {visible ? creds.temporaryPassword : '•'.repeat(creds.temporaryPassword.length)}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setVisible(v => !v)}
                  className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-all">
                  {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <CopyBtn k="password" value={creds.temporaryPassword} />
              </div>
            </div>
          </div>

          {/* Login URL */}
          <div className="bg-gray-800 rounded-xl p-3.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Login URL</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-indigo-400 text-xs font-mono truncate">{creds.loginUrl}</p>
              <CopyBtn k="url" value={creds.loginUrl} />
            </div>
          </div>

          {creds.adminEmail && (
            <div className="bg-gray-800 rounded-xl p-3.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Admin Email</p>
              <p className="text-gray-300 text-sm">{creds.adminEmail}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors">
            Done — Back to Restaurants
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

const INIT_FORM = {
  name: '', businessType: 'restaurant', ownerName: '', email: '', phone: '',
  country: 'Pakistan', city: '', address: '', timezone: 'Asia/Karachi', currency: 'PKR',
  planSlug: '', billingCycle: 'monthly', trialDays: '', subscriptionStart: '',
  maxBranches: '', maxUsers: '',
  features: { ...BLANK_FEATURES },
  adminName: '', adminEmail: '', defaultBranchName: '', notes: '',
};

const PlatformCreateRestaurant = () => {
  const navigate = useNavigate();
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState(INIT_FORM);
  const [plans, setPlans]       = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]     = useState({});
  const [credentials, setCredentials] = useState(null);

  const selectedPlan = plans.find(p => p.slug === form.planSlug) || null;

  // Fetch plans once
  useEffect(() => {
    setLoadingPlans(true);
    platformAPI.get('/plans?isActive=true&limit=20')
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoadingPlans(false));
  }, []);

  const handlePlanSelect = (plan) => {
    setForm(prev => ({
      ...prev,
      planSlug: plan.slug,
      features: featuresFromPlan(plan),
      maxBranches: '',
      maxUsers: '',
    }));
  };

  // Per-step validation
  const validate = (s) => {
    const errs = {};
    if (s === 1 && !form.name.trim()) errs.name = 'Restaurant name is required';
    if (s === 2 && !form.planSlug)    errs.planSlug = 'Please select a plan';
    if (s === 4 && !form.adminName.trim()) errs.adminName = 'Admin username is required';
    return errs;
  };

  const next = () => {
    const errs = validate(step);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }
    setErrors({});
    setStep(s => s + 1);
  };

  const back = () => {
    setErrors({});
    setStep(s => s - 1);
  };

  const handleCreate = async () => {
    const errs = validate(4);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setSubmitting(true);
    try {
      const { data: res } = await platformAPI.post('/restaurants', {
        name:               form.name.trim(),
        businessType:       form.businessType,
        ownerName:          form.ownerName.trim(),
        email:              form.email.trim(),
        phone:              form.phone.trim(),
        address:            form.address.trim(),
        city:               form.city.trim(),
        country:            form.country.trim(),
        timezone:           form.timezone,
        currency:           form.currency,
        planSlug:           form.planSlug,
        billingCycle:       form.billingCycle,
        trialDays:          form.trialDays !== '' ? Number(form.trialDays) : undefined,
        subscriptionStart:  form.subscriptionStart || undefined,
        maxBranches:        form.maxBranches !== '' ? Number(form.maxBranches) : undefined,
        maxUsers:           form.maxUsers !== '' ? Number(form.maxUsers) : undefined,
        features:           form.features,
        adminName:          form.adminName.trim(),
        adminEmail:         form.adminEmail.trim(),
        defaultBranchName:  form.defaultBranchName.trim(),
        notes:              form.notes.trim(),
      });
      setCredentials(res.data.credentials);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  const stepContent = {
    1: <Step1 form={form} setForm={setForm} />,
    2: <Step2 form={form} setForm={setForm} plans={plans} loadingPlans={loadingPlans} onPlanSelect={handlePlanSelect} />,
    3: <Step3 form={form} setForm={setForm} selectedPlan={selectedPlan} />,
    4: <Step4 form={form} setForm={setForm} />,
    5: <Step5 form={form} selectedPlan={selectedPlan} />,
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Page header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/platform/restaurants')}
          className="p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white">Create Restaurant</h2>
          <p className="text-xs text-gray-600 mt-0.5">Platform-only onboarding — {STEPS.length} steps</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                active  ? 'bg-indigo-600 text-white' :
                done    ? 'bg-indigo-500/10 text-indigo-400' :
                          'text-gray-600'
              }`}>
                {done
                  ? <Check size={13} />
                  : <Icon size={13} />
                }
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px mx-1 ${done ? 'bg-indigo-500' : 'bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 mb-6">
        {stepContent[step]}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {step > 1 ? (
          <button onClick={back}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <button onClick={() => navigate('/platform/restaurants')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:text-white transition-colors">
            Cancel
          </button>
        )}

        {step < 5 ? (
          <button onClick={next}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors">
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={handleCreate} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Create Restaurant
              </>
            )}
          </button>
        )}
      </div>

      {/* Credentials modal */}
      {credentials && (
        <CredentialsModal
          creds={credentials}
          onClose={() => navigate('/platform/restaurants')}
        />
      )}
    </div>
  );
};

export default PlatformCreateRestaurant;
