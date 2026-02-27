
export interface Ride {
  id: number;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  distance: number;
  duration: number;
  price: number;
  status: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  user_id: number;
  user_name: string;
  user_email: string;
  driver: {
    id: number;
    name: string;
    rating: number;
    vehiclePlate: string;
    vehicleType: string;
  };
  driver_id: number;
  driver_name: string;
  vehicle_plate: string;
  vehicle_type: string;
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  memberSince: string;
  profile: {
    paymentMethods: string[];
    preferences: unknown;
  };
  stats: {
    totalRides: number;
    completionRate: string;
    monthlyRides: number;
    rating: string;
  };
  recentRides: {
    id: string;
    pickup: string;
    destination: string;
    status: string;
    createdAt: string;
  }[];
}


export interface Driver {
  id: number;
  name: string;
  vehicleType: string;
  vehiclePlate: string;
  rating: string;
  location: { type: 'Point'; coordinates: [number, number] };
  lat:number; 
  lng: number
}

export interface RideResponse {
  id?: string;
  rideId?: string;
  _id?: string;
  pickup: string;
  destination: string;
  distance: number;
  duration: number;
  price: number;
  driverId: string;
  [key: string]: unknown;
}

  export interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'outline';
    className?: string;
    disabled?: boolean;
  }

  export interface RegisterResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    phone_number: string;
    role: 'USER' | 'DRIVER';
    driver?: {
      license_number: string;
      vehicle_type: string;
      vehicle_make: string;
      vehicle_model: string;
      vehicle_year: number;
      vehicle_plate: string;
    };
  };
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    phone_number?: string;
    role: 'USER' | 'DRIVER';
  };
}

export interface UserData {
  id: number;
  email: string;
  name: string;
  token: string;
  phone_number?: string;
  role: 'USER' | 'DRIVER';
}

