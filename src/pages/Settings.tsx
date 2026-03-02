import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Calculator } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, addDoc, deleteDoc, where, setDoc } from 'firebase/firestore';
import { ref, get, update } from 'firebase/database';
import { db, rtdb, Switch, EBTariffSlab, BillingSettings, auth, AppUser } from '../lib/firebase';

interface SettingsProps {
  onNavigateBack: () => void;
}

export default function Settings({ onNavigateBack }: SettingsProps) {
  const [tariffSlabs, setTariffSlabs] = useState<EBTariffSlab[]>([]);
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    // 1. Get or Create User Doc
    const q = query(collection(db, 'Users'), where('Mail', '==', user.email));
    const querySnapshot = await getDocs(q);
    
    let currentUserId = '';
    let userData: AppUser | null = null;

    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0];
      currentUserId = docData.id;
      userData = { id: docData.id, ...docData.data() } as AppUser;
    } else {
      // Create user doc if it doesn't exist to ensure we have an ID for subcollections
      const newDocRef = await addDoc(collection(db, 'Users'), {
        "Mail": user.email,
        "Device Name": "",
        "Owner Name": ""
      });
      currentUserId = newDocRef.id;
      userData = { id: newDocRef.id, "Mail": user.email, "Device Name": "", "Owner Name": "" };
    }

    setAppUser(userData);

    // 2. Load Subcollections from Users/{userId}/...
    const tariffQuery = query(collection(db, `Users/${currentUserId}/eb_tariff_slabs`), orderBy('slab_order'));
    const settingsQuery = query(collection(db, `Users/${currentUserId}/billing_settings`), limit(1));

    const [tariffSnapshot, settingsSnapshot] = await Promise.all([
      getDocs(tariffQuery),
      getDocs(settingsQuery)
    ]);

    const tariffData = tariffSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as EBTariffSlab));
    const settingsData = settingsSnapshot.empty ? null : { id: settingsSnapshot.docs[0].id, ...settingsSnapshot.docs[0].data() };

    setTariffSlabs(tariffData);
    setBillingSettings(settingsData);

    // 3. Load Switches from RTDB
    if (userData && userData['Device Name']) {
      const switchesRef = ref(rtdb, `devices/${userData['Device Name']}/switches`);
      const snapshot = await get(switchesRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedSwitches: Switch[] = Array.isArray(data) 
          ? data.map((s, i) => ({ 
              ...s, 
              id: String(i),
              name: s?.name || `Switch ${i + 1}`,
              device_type: s?.device_type || 'other',
              is_on: !!s?.is_on,
              wattage: s?.wattage || 0
            }))
          : Object.entries(data)
              .filter(([key]) => key !== 'Question' && key !== 'Answer')
              .map(([key, value]: [string, any]) => ({ 
              ...value, 
              id: key,
              name: value?.name || `Switch ${key}`,
              device_type: value?.device_type || 'other',
              is_on: !!value?.is_on,
              wattage: value?.wattage || 0
            }));
        setSwitches(loadedSwitches);
      } else {
        setSwitches([
          { id: '0', name: 'Switch 1', device_type: 'bulb', is_on: false, switch_number: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), wattage: 0 } as any,
          { id: '1', name: 'Switch 2', device_type: 'fan', is_on: false, switch_number: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), wattage: 0 } as any,
          { id: '2', name: 'Switch 3', device_type: 'tv', is_on: false, switch_number: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), wattage: 0 } as any,
          { id: '3', name: 'Switch 4', device_type: 'fridge', is_on: false, switch_number: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), wattage: 0 } as any,
        ]);
      }
    }
  }

  async function updateTariffSlab(id: string, field: string, value: number | null) {
    if (!appUser?.id) return;
    const slabRef = doc(db, `Users/${appUser.id}/eb_tariff_slabs`, id);
    await updateDoc(slabRef, { [field]: value, updated_at: new Date().toISOString() });
    loadSettings();
  }

  async function addTariffSlab() {
    if (!appUser?.id) return;
    const maxOrder = Math.max(...tariffSlabs.map(s => s.slab_order), 0);
    await addDoc(collection(db, `Users/${appUser.id}/eb_tariff_slabs`), {
      min_units: 0,
      max_units: 100,
      rate_per_unit: 0,
      slab_order: maxOrder + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    loadSettings();
  }

  async function deleteTariffSlab(id: string) {
    if (!appUser?.id) return;
    await deleteDoc(doc(db, `Users/${appUser.id}/eb_tariff_slabs`, id));
    loadSettings();
  }

  function updateBillingSettings(field: string, value: string | number) {
    setBillingSettings((prev: any) => {
      const newData = prev ? { ...prev } : {};
      newData[field] = value;
      return newData;
    });
  }

  function updateSwitchLocal(id: string, field: string, value: string | number) {
    setSwitches(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  async function saveAllSettings() {
    if (appUser) {
      // Save User Settings to Firestore
      if (appUser.id) {
        const ref = doc(db, 'Users', appUser.id);
        await updateDoc(ref, { 
          "Owner Name": appUser["Owner Name"],
          "Device Name": appUser["Device Name"]
        });
      } else {
        await addDoc(collection(db, 'Users'), {
          "Mail": appUser["Mail"],
          "Owner Name": appUser["Owner Name"],
          "Device Name": appUser["Device Name"]
        });
      }

      // Save Switch Settings to RTDB
      if (appUser["Device Name"] && switches.length > 0) {
        const updates: any = {};
        switches.forEach(sw => {
           const basePath = `devices/${appUser["Device Name"]}/switches/${sw.id}`;
           updates[`${basePath}/name`] = sw.name;
           updates[`${basePath}/device_type`] = sw.device_type;
           updates[`${basePath}/switch_number`] = sw.switch_number;
           updates[`${basePath}/is_on`] = sw.is_on;
           updates[`${basePath}/wattage`] = (sw as any).wattage || 0;
           updates[`${basePath}/updated_at`] = new Date().toISOString();
           if (!sw.created_at) updates[`${basePath}/created_at`] = new Date().toISOString();
        });
        await update(ref(rtdb), updates);
      }

      // Save Billing Settings
      if (billingSettings) {
        const target = parseFloat(String(billingSettings.monthly_target));
        const maxPower = parseFloat(String(billingSettings.max_power_limit));
        const months = parseInt(String(billingSettings.billing_months));
        
        const billingData = {
          monthly_target: isNaN(target) ? 0 : target,
          billing_months: isNaN(months) ? 1 : months,
          max_power_limit: isNaN(maxPower) ? 0 : maxPower,
          updated_at: new Date().toISOString()
        };

        if (billingSettings.id) {
          const settingsRef = doc(db, `Users/${appUser.id}/billing_settings`, billingSettings.id);
          await updateDoc(settingsRef, billingData);
        } else {
          await addDoc(collection(db, `Users/${appUser.id}/billing_settings`), { 
            ...billingData,
            current_month_start: new Date().toISOString() 
          });
        }
      }
    }
    showSuccess();
    loadSettings();
  }

  function showSuccess() {
    setSuccessMessage('Settings saved successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  }

  function autoCalculateLimits() {
    const totalWattage = switches.reduce((acc, sw) => acc + ((sw as any).wattage || 0), 0);
    const months = billingSettings?.billing_months || 1;

    // Max Power Limit: Total Wattage + 10% buffer
    const maxPower = Math.ceil(totalWattage * 1.1);

    // Target: Total Wattage * 24 hours * 30 days * Months (converted to kWh)
    const calculatedTarget = (totalWattage * 24 * 30 * months) / 1000;

    updateBillingSettings('max_power_limit', maxPower);
    updateBillingSettings('monthly_target', parseFloat(calculatedTarget.toFixed(3)));
    
    setSuccessMessage(`Auto-calculated limits based on ${totalWattage}W total load.`);
    setTimeout(() => setSuccessMessage(''), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User & Device Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={appUser?.["Owner Name"] || ''}
                  onChange={(e) => setAppUser(prev => prev ? ({ ...prev, "Owner Name": e.target.value }) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter owner name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name (ESP32 ID)
                </label>
                <input
                  type="text"
                  value={appUser?.["Device Name"] || ''}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                  placeholder="e.g., ESP32_E61930"
                />
              </div>
            </div>
          </div>

          {switches.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Switch Configuration</h2>
              <div className="space-y-4">
                {switches.map((sw) => (
                  <div key={sw.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Switch {sw.switch_number} Name
                      </label>
                      <input
                        type="text"
                        value={sw.name}
                        onChange={(e) => updateSwitchLocal(sw.id, 'name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Device Type
                      </label>
                      <select
                        value={sw.device_type}
                        onChange={(e) => updateSwitchLocal(sw.id, 'device_type', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="bulb">Bulb</option>
                        <option value="fan">Fan</option>
                        <option value="tv">TV</option>
                        <option value="fridge">Fridge</option>
                        <option value="ac">AC</option>
                        <option value="heater">Heater</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rated Wattage (W)
                      </label>
                      <input
                        type="number"
                        value={(sw as any).wattage || ''}
                        onChange={(e) => updateSwitchLocal(sw.id, 'wattage', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 60"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">EB Tariff Slabs</h2>
              <button
                onClick={addTariffSlab}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Slab
              </button>
            </div>
            <div className="space-y-4">
              {tariffSlabs.map((slab, index) => (
                <div key={slab.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Units
                    </label>
                    <input
                      type="number"
                      value={slab.min_units}
                      onChange={(e) => updateTariffSlab(slab.id, 'min_units', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Units {index === tariffSlabs.length - 1 && '(Leave empty for unlimited)'}
                    </label>
                    <input
                      type="number"
                      value={slab.max_units || ''}
                      onChange={(e) => updateTariffSlab(slab.id, 'max_units', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate (₹/kWh)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={slab.rate_per_unit}
                      onChange={(e) => updateTariffSlab(slab.id, 'rate_per_unit', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => deleteTariffSlab(slab.id)}
                    className="px-4 py-3 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Billing Settings</h2>
              <button
                onClick={autoCalculateLimits}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors bg-blue-50 px-3 py-2 rounded-lg"
                title="Calculate based on connected switches"
              >
                <Calculator className="w-4 h-4" />
                Auto-Calculate Limits
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Period (Months)
                </label>
                <select
                  value={billingSettings?.billing_months || 1}
                  onChange={(e) => updateBillingSettings('billing_months', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6].map(month => (
                    <option key={month} value={month}>{month} Month{month > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Target (Units/kWh)
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={billingSettings?.monthly_target ?? ''}
                  onChange={(e) => updateBillingSettings('monthly_target', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Set target limit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Power Limit (W)
                </label>
                <input
                  type="number"
                  min="0"
                  value={billingSettings?.max_power_limit ?? ''}
                  onChange={(e) => updateBillingSettings('max_power_limit', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. 2000"
                />
              </div>
            </div>
          </div>

          <button
            onClick={saveAllSettings}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 transition-colors shadow-lg font-medium text-lg"
          >
            <Save className="w-5 h-5" />
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
}
