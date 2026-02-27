
import { VehicleType } from '@/types/ride';

interface VehicleTypeData {
  id: VehicleType;
  name: string;
  icon: React.ComponentType<any> | string; 
  backendType: string;
  priceMultiplier: number;
}

interface VehicleTypeSelectorProps {
  vehicleTypes: VehicleTypeData[];
  selectedType: VehicleType;
  onSelectType: (type: VehicleType) => void;
}

export default function VehicleTypeSelector({
  vehicleTypes,
  selectedType,
  onSelectType
}: VehicleTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Vehicle Type
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {vehicleTypes.map((vehicle) => {
          const IconComponent = vehicle.icon;
          const isSelected = selectedType === vehicle.id;
          
          return (
            <button
              key={vehicle.id}
              onClick={() => onSelectType(vehicle.id)}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg border-2 
                transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="text-2xl mb-2">
                {typeof IconComponent === 'string' ? (
                  <span>{IconComponent}</span> // Render emoji as string
                ) : (
                  <IconComponent className="w-6 h-6" /> // Render Lucide icon component
                )}
              </div>
              <span className={`font-medium ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                {vehicle.name}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                ×{vehicle.priceMultiplier}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}