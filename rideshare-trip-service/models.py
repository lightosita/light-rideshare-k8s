from datetime import datetime
from decimal import Decimal

class Trip:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.ride_request_id = kwargs.get('ride_request_id')
        self.driver_id = kwargs.get('driver_id')
        self.rider_id = kwargs.get('rider_id')
        self.pickup_lat = kwargs.get('pickup_lat')
        self.pickup_lng = kwargs.get('pickup_lng')
        self.pickup_address = kwargs.get('pickup_address')
        self.dropoff_lat = kwargs.get('dropoff_lat')
        self.dropoff_lng = kwargs.get('dropoff_lng')
        self.dropoff_address = kwargs.get('dropoff_address')
        self.status = kwargs.get('status', 'pending')
        self.vehicle_type = kwargs.get('vehicle_type')
        self.estimated_fare = kwargs.get('estimated_fare')
        self.actual_fare = kwargs.get('actual_fare')
        self.distance_km = kwargs.get('distance_km')
        self.duration_minutes = kwargs.get('duration_minutes')
        self.started_at = kwargs.get('started_at')
        self.completed_at = kwargs.get('completed_at')
        self.created_at = kwargs.get('created_at')
        self.updated_at = kwargs.get('updated_at')
    
    def to_dict(self):
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, Decimal):
                result[key] = float(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result

class FareEstimateRequest:
    def __init__(self, data):
        self.pickup_location = data.get('pickup_location', {})
        self.dropoff_location = data.get('dropoff_location', {})
        self.vehicle_type = data.get('vehicle_type', 'standard')

class FareConfig:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.vehicle_type = kwargs.get('vehicle_type')
        self.base_fare = kwargs.get('base_fare')
        self.per_km_rate = kwargs.get('per_km_rate')
        self.per_minute_rate = kwargs.get('per_minute_rate')
        self.minimum_fare = kwargs.get('minimum_fare')
        self.surge_multiplier = kwargs.get('surge_multiplier')
        self.updated_at = kwargs.get('updated_at')
    
    def to_dict(self):
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, Decimal):
                result[key] = float(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result