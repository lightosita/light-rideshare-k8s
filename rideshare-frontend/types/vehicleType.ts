// types/ride/vehicleTypes.ts
import { VehicleType } from "./ride";
import { Car, Truck, BusFront, Sparkles, Zap } from 'lucide-react';

export const vehicleTypes = [
  {
    id: 'SEDAN' as VehicleType,
    name: 'Sedan',
    icon: Car,
    backendType: 'sedan',
    priceMultiplier: 1.0
  },
  {
    id: 'SUV' as VehicleType,
    name: 'SUV',
    icon: Truck,
    backendType: 'suv',
    priceMultiplier: 1.3
  },
  {
    id: 'VAN' as VehicleType,
    name: 'Van',
    icon: BusFront,
    backendType: 'van',
    priceMultiplier: 1.5
  },
  {
    id: 'LUXURY' as VehicleType,
    name: 'Luxury',
    icon: Sparkles,
    backendType: 'luxury',
    priceMultiplier: 2.0
  },
  {
    id: 'ELECTRIC' as VehicleType,
    name: 'Electric',
    icon: Zap,
    backendType: 'electric',
    priceMultiplier: 1.2
  },
];