'use client';

import { BEVERAGE_TYPE_LABELS } from '@/lib/constants';

interface BeverageTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
}

const types = [
  { key: 'SPIRITS', description: 'Bourbon, whiskey, vodka, gin, etc.' },
  { key: 'WINE', description: 'Red, white, sparkling, etc.' },
  { key: 'MALT_BEVERAGE', description: 'Beer, ale, lager, etc.' },
];

export default function BeverageTypeSelector({ value, onChange }: BeverageTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Beverage Type</label>
      <div className="grid grid-cols-3 gap-3">
        {types.map((type) => {
          const isSelected = value === type.key;
          return (
            <button
              key={type.key}
              type="button"
              onClick={() => onChange(type.key)}
              className={`p-4 rounded-lg border-2 text-left transition-all min-h-[44px]
                ${isSelected
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              aria-pressed={isSelected}
            >
              <span className={`block font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                {BEVERAGE_TYPE_LABELS[type.key]}
              </span>
              <span className="block text-xs text-gray-500 mt-1">{type.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
