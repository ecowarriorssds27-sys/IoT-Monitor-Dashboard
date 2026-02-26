import { useState } from 'react';
import { Power, Zap, Edit2, Check, X } from 'lucide-react';
import { Switch } from '../lib/firebase';

interface SwitchCardProps {
  switchData: Switch;
  currentPower: number;
  onToggle: (id: string, newState: boolean) => void;
  onUpdateName: (id: string, newName: string) => void;
}

const deviceIcons: Record<string, typeof Power> = {
  bulb: Power,
  fan: Zap,
  tv: Power,
  fridge: Power,
};

export default function SwitchCard({ switchData, currentPower, onToggle, onUpdateName }: SwitchCardProps) {
  const Icon = deviceIcons[switchData.device_type] || Power;
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(switchData.name);

  const handleSave = () => {
    onUpdateName(switchData.id, tempName);
    setIsEditing(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
      switchData.is_on
        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/30'
        : 'bg-white text-gray-800 shadow-lg border border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 mr-2">
          {isEditing ? (
            <div className="flex items-center gap-1 mb-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full px-2 py-1 text-gray-900 rounded text-sm border-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button onClick={handleSave} className="p-1 hover:bg-black/10 rounded text-current">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-black/10 rounded text-current">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group mb-1">
              <h3 className="text-lg font-semibold">{switchData.name}</h3>
              <button 
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className={`text-sm ${switchData.is_on ? 'text-green-100' : 'text-gray-500'}`}>
            {switchData.device_type.charAt(0).toUpperCase() + switchData.device_type.slice(1)}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${
          switchData.is_on ? 'bg-white/20' : 'bg-gray-100'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {switchData.is_on && (
        <div className="mb-4">
          <div className="text-3xl font-bold">{currentPower.toFixed(1)} W</div>
          <div className="text-sm text-green-100">Current Power</div>
        </div>
      )}

      <button
        onClick={() => onToggle(switchData.id, !switchData.is_on)}
        className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
          switchData.is_on
            ? 'bg-white text-green-600 hover:bg-green-50'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {switchData.is_on ? 'Turn OFF' : 'Turn ON'}
      </button>
    </div>
  );
}
