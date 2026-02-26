import { useEffect, useState, useMemo } from 'react';
import { Settings, Activity, Zap, Gauge, Lightbulb, Battery, History, Calendar, Wifi, WifiOff } from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { ref, onValue, set } from 'firebase/database';
import { db, auth, AppUser, PowerReading, rtdb, Switch, EBTariffSlab } from '../lib/firebase';
import { calculateBill } from '../utils/billCalculator';
import BillSummary from '../components/BillSummary';
import SwitchCard from '../components/SwitchCard';

interface DashboardProps {
  onNavigateToSettings: () => void;
}

export default function Dashboard({ onNavigateToSettings }: DashboardProps) {
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>('');
  const [latestReading, setLatestReading] = useState<PowerReading | null>(null);
  const [liveReading, setLiveReading] = useState<PowerReading | null>(null);
  const [history, setHistory] = useState<PowerReading[]>([]);
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [tariffSlabs, setTariffSlabs] = useState<EBTariffSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  
  // State for selected date, defaulting to today (local time)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  useEffect(() => {
    const fetchUserDetails = async () => {
      const user = auth.currentUser;
      if (user && user.email) {
        try {
          const q = query(collection(db, 'Users'), where('Mail', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            const userData = docData.data() as AppUser;
            setDeviceName(userData['Device Name']);
            setOwnerName(userData['Owner Name'] || 'User');

            // Fetch Tariff Slabs for this user
            const tariffQuery = query(collection(db, `Users/${docData.id}/eb_tariff_slabs`), orderBy('slab_order'));
            const tariffSnapshot = await getDocs(tariffQuery);
            const tariffData = tariffSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as EBTariffSlab));
            setTariffSlabs(tariffData);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      }
      setLoading(false);
    };

    fetchUserDetails();
  }, []);

  useEffect(() => {
    if (!deviceName) return;

    // Construct path: power_data/{deviceName}/{selectedDate}
    // Note: We order by time string descending to get the latest
    // We remove limit(100) to get all data for the day to calculate accurate consumption
    const readingsRef = collection(db, 'power_data', deviceName, selectedDate);
    const q = query(readingsRef, orderBy('time', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const readings = snapshot.docs.map(doc => doc.data() as PowerReading);
        setLatestReading(readings[0]);
        setHistory(readings);
      } else {
        setLatestReading(null);
        setHistory([]);
      }
    });

    return () => unsubscribe();
  }, [deviceName, selectedDate]);

  // Effect to listen to Switches from RTDB
  useEffect(() => {
    if (!deviceName) return;

    const switchesRef = ref(rtdb, `devices/${deviceName}/switches`);
    
    const unsubscribe = onValue(switchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Map RTDB data to Switch interface
        const loadedSwitches: Switch[] = Array.isArray(data) 
          ? data.map((s, i) => ({ 
              ...s, 
              id: String(i),
              name: typeof s?.name === 'string' ? s.name : `Switch ${i + 1}`,
              device_type: typeof s?.device_type === 'string' ? s.device_type : 'other',
              is_on: !!s?.is_on
            }))
          : Object.entries(data)
              .filter(([key]) => key !== 'Question' && key !== 'Answer')
              .map(([key, value]: [string, any]) => ({ 
              ...value, 
              id: key,
              name: typeof value?.name === 'string' ? value.name : `Switch ${key}`,
              device_type: typeof value?.device_type === 'string' ? value.device_type : 'other',
              is_on: !!value?.is_on
            }));
        
        setSwitches(loadedSwitches);
      } else {
        // Initialize 4 switches if not present
        const initialSwitches = [
          { name: 'Switch 1', device_type: 'bulb', is_on: false, switch_number: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { name: 'Switch 2', device_type: 'fan', is_on: false, switch_number: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { name: 'Switch 3', device_type: 'tv', is_on: false, switch_number: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { name: 'Switch 4', device_type: 'fridge', is_on: false, switch_number: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ];
        set(switchesRef, initialSwitches);
      }
    });

    return () => unsubscribe();
  }, [deviceName]);

  // Effect to listen to Live Data from RTDB
  useEffect(() => {
    if (!deviceName) return;

    const liveRef = ref(rtdb, `devices/${deviceName}/live`);
    const unsubscribe = onValue(liveRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLiveReading({
          ...data,
          time: new Date().toLocaleTimeString(),
        } as PowerReading);
      }
    });

    return () => unsubscribe();
  }, [deviceName]);

  // Monitor Online Status
  useEffect(() => {
    if (!deviceName) return;
    const answerRef = ref(rtdb, `devices/${deviceName}/Answer`);
    const unsubscribe = onValue(answerRef, (snapshot) => {
      setIsOnline(snapshot.val() === "Am Here");
    });
    return () => unsubscribe();
  }, [deviceName]);

  const handleConnect = async () => {
    if (!deviceName) return;
    await set(ref(rtdb, `devices/${deviceName}/Answer`), null);
    await set(ref(rtdb, `devices/${deviceName}/Question`), "Hii");
  };

  const toggleSwitch = (id: string, newState: boolean) => {
    if (!deviceName) return;
    const switchRef = ref(rtdb, `devices/${deviceName}/switches/${id}/is_on`);
    set(switchRef, newState);
    const updatedRef = ref(rtdb, `devices/${deviceName}/switches/${id}/updated_at`);
    set(updatedRef, new Date().toISOString());
  };

  const updateSwitchName = (id: string, newName: string) => {
    if (!deviceName) return;
    const nameRef = ref(rtdb, `devices/${deviceName}/switches/${id}/name`);
    set(nameRef, newName);
  };

  const getTodayDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const isToday = selectedDate === getTodayDate();
  const activeReading = (isToday && liveReading) ? liveReading : latestReading;

  // Calculate bill based on energy (assuming energy is in kWh)
  const estimatedBill = activeReading ? calculateBill(activeReading.energy, tariffSlabs) : 0;

  // Calculate daily consumption with reset handling
  // This sums up the differences between readings to get the total consumption for the day
  const dayConsumption = useMemo(() => {
    if (history.length < 2) return 0;
    
    // Create a copy and sort ascending by time to calculate deltas correctly
    const sorted = [...history].sort((a, b) => String(a.time).localeCompare(String(b.time)));
    
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i-1].energy;
      const curr = sorted[i].energy;
      
      if (curr >= prev) {
        total += (curr - prev);
      } else {
        // Reset detected (curr < prev), assume reset to 0, so add curr
        total += curr;
      }
    }
    return total;
  }, [history]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!deviceName) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Device Linked</h2>
          <p className="text-gray-500 mb-6">
            Your account ({auth.currentUser?.email}) is not linked to any IoT device yet. 
            Please go to Settings to configure your device.
          </p>
          <button
            onClick={onNavigateToSettings}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              IoT Power Monitor
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <span className="font-medium text-blue-600">Welcome, {ownerName}</span>
              <span className="text-gray-400">|</span>
              <span>{deviceName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleConnect}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-colors shadow-lg font-medium text-white ${
                isOnline ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <button
              onClick={onNavigateToSettings}
              className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>

        {/* Date Picker and Daily Consumption */}
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700">
                Select Date
              </label>
              <input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-blue-50 px-6 py-3 rounded-xl">
            <div>
              <p className="text-sm text-blue-600 font-medium">Consumption ({selectedDate})</p>
              <p className="text-2xl font-bold text-blue-900">{dayConsumption.toFixed(3)} <span className="text-sm font-normal">kWh</span></p>
            </div>
            <Activity className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <BillSummary
          totalUnits={activeReading?.energy || 0}
          estimatedBill={estimatedBill}
          billingPeriod={1}
          todayUsage={dayConsumption} // Showing selected day consumption here
        />

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Control Panel</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {switches.map(sw => (
              <SwitchCard
                key={sw.id}
                switchData={sw}
                currentPower={0} // Individual power reading not available in current data structure
                onToggle={toggleSwitch}
                onUpdateName={updateSwitchName}
              />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Readings for {selectedDate}
            {activeReading?.time && (
              <span className="text-sm font-normal text-gray-500 ml-auto">
                Last updated: {activeReading.time}
              </span>
            )}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Voltage Card */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 font-medium">Voltage</h3>
                <div className="p-3 bg-yellow-100 rounded-xl text-yellow-600">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {activeReading?.voltage.toFixed(1) || 0} <span className="text-lg text-gray-500">V</span>
              </div>
            </div>

            {/* Current Card */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 font-medium">Current</h3>
                <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {activeReading?.current.toFixed(2) || 0} <span className="text-lg text-gray-500">A</span>
              </div>
            </div>

            {/* Power Card */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 font-medium">Power</h3>
                <div className="p-3 bg-red-100 rounded-xl text-red-600">
                  <Lightbulb className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {activeReading?.power.toFixed(1) || 0} <span className="text-lg text-gray-500">W</span>
              </div>
            </div>

            {/* Energy Card */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 font-medium">Energy</h3>
                <div className="p-3 bg-green-100 rounded-xl text-green-600">
                  <Battery className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {activeReading?.energy.toFixed(3) || 0} <span className="text-lg text-gray-500">kWh</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-6 h-6 text-purple-600" />
              History ({selectedDate})
              <span className="text-sm font-normal text-gray-500 ml-2">({history.length} samples)</span>
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 bg-gray-50">Time</th>
                  <th className="px-6 py-4 bg-gray-50">Voltage (V)</th>
                  <th className="px-6 py-4 bg-gray-50">Current (A)</th>
                  <th className="px-6 py-4 bg-gray-50">Power (W)</th>
                  <th className="px-6 py-4 bg-gray-50">Energy (kWh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((reading, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{reading.time}</td>
                    <td className="px-6 py-4">{reading.voltage?.toFixed(1)}</td>
                    <td className="px-6 py-4">{reading.current?.toFixed(2)}</td>
                    <td className="px-6 py-4">{reading.power?.toFixed(1)}</td>
                    <td className="px-6 py-4">{reading.energy?.toFixed(3)}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No data available for {selectedDate}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
