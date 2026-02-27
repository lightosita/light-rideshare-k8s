import swaggerJsdoc, { Options } from 'swagger-jsdoc';
import { OpenAPIV3 } from 'openapi-types';

// Schema definitions
const driverProfileSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
        id: { type: 'string', description: 'Unique ID of the driver' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', description: 'Driver phone number' },
        licenseNumber: { type: 'string' },
        vehicleType: { type: 'string', enum: ['SEDAN', 'SUV', 'TRUCK'] },
        vehicleMake: { type: 'string' },
        vehicleModel: { type: 'string' },
        vehicleYear: { type: 'number' },
        licensePlate: { type: 'string' },
        isVerified: { type: 'boolean' },
        isAvailable: { type: 'boolean' },
        rating: { type: 'number', format: 'float', description: 'Driver rating (0.0 to 5.0)' },
        totalTrips: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' }
    },
    required: ['id', 'email', 'firstName', 'lastName']
};

const locationSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
        latitude: { type: 'number', format: 'float', description: 'Current latitude' },
        longitude: { type: 'number', format: 'float', description: 'Current longitude' },
        heading: { type: 'number', format: 'float', description: 'Direction of travel in degrees (0-360).' },
        speedKmh: { type: 'number', format: 'float', description: 'Current speed in km/h.' }
    },
    required: ['latitude', 'longitude']
};

const tripDetailsSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['SEARCHING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
        rider_info: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                rating: { type: 'number', format: 'float' },
            }
        },
        pickup_address: { type: 'string' },
        dropoff_address: { type: 'string' },
        estimated_fare: { type: 'number', format: 'float' },
        vehicle_type: { type: 'string' }
    },
    required: ['id', 'status', 'pickup_address', 'dropoff_address']
};

// New schemas for dashboard routes
const dashboardSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
        driver: { $ref: '#/components/schemas/DriverProfile' },
        active_trip: { $ref: '#/components/schemas/TripDetails' },
        today_earnings: { type: 'number', format: 'float' },
        total_earnings: { type: 'number', format: 'float' },
        today_trips: { type: 'number' },
        total_trips: { type: 'number' },
        rating: { type: 'number', format: 'float' },
        is_available: { type: 'boolean' },
        recent_trips: {
            type: 'array',
            items: { $ref: '#/components/schemas/TripDetails' }
        }
    }
};

const tripListSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
        trips: {
            type: 'array',
            items: { $ref: '#/components/schemas/TripDetails' }
        },
        pagination: {
            type: 'object',
            properties: {
                total: { type: 'number' },
                page: { type: 'number' },
                limit: { type: 'number' },
                total_pages: { type: 'number' },
                has_next: { type: 'boolean' },
                has_prev: { type: 'boolean' }
            }
        }
    }
};

const earningsSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
        total_earnings: { type: 'number', format: 'float' },
        today_earnings: { type: 'number', format: 'float' },
        weekly_earnings: { type: 'number', format: 'float' },
        monthly_earnings: { type: 'number', format: 'float' },
        transactions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    trip_id: { type: 'string' },
                    amount: { type: 'number', format: 'float' },
                    date: { type: 'string', format: 'date-time' },
                    rider_name: { type: 'string' },
                    status: { type: 'string' }
                }
            }
        },
        earnings_over_time: {
            type: 'object',
            properties: {
                daily: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            date: { type: 'string' },
                            earnings: { type: 'number', format: 'float' }
                        }
                    }
                },
                weekly: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            week: { type: 'string' },
                            earnings: { type: 'number', format: 'float' }
                        }
                    }
                },
                monthly: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            month: { type: 'string' },
                            earnings: { type: 'number', format: 'float' }
                        }
                    }
                }
            }
        }
    }
};

const activeTripSchema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: {
        trip: { $ref: '#/components/schemas/TripDetails' },
        location: {
            type: 'object',
            properties: {
                current_lat: { type: 'number', format: 'float' },
                current_lng: { type: 'number', format: 'float' },
                heading: { type: 'number', format: 'float' },
                speed: { type: 'number', format: 'float' }
            }
        },
        trip_progress: {
            type: 'object',
            properties: {
                distance_traveled: { type: 'number', format: 'float' },
                time_elapsed: { type: 'number' },
                estimated_time_remaining: { type: 'number' },
                progress_percentage: { type: 'number' }
            }
        }
    }
};

// Main Swagger Definition Object
const swaggerDefinition: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
        title: 'Driver API Documentation',
        version: '1.0.0',
        description: 'API for managing driver-related operations, including authentication, location, and trip tracking.',
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            } as OpenAPIV3.SecuritySchemeObject,
        },
        schemas: {
            DriverProfile: driverProfileSchema,
            Location: locationSchema,
            TripDetails: tripDetailsSchema,
            Dashboard: dashboardSchema,
            TripList: tripListSchema,
            Earnings: earningsSchema,
            ActiveTrip: activeTripSchema,
        }
    },
    servers: [
        {
            url: '/api/v1/drivers',
            description: 'Driver Service API',
        },
    ],
    tags: [
        { name: 'Authentication', description: 'Driver registration, login, and email verification' },
        { name: 'Profile & Details', description: 'Driver\'s personal information and lookup' },
        { name: 'Location & Availability', description: 'Driver\'s status and geographical location updates' },
        { name: 'Trips', description: 'Driver\'s trips and current active trip status' },
        { name: 'Dashboard', description: 'Driver dashboard and earnings information' }
    ],
    paths: {
        // --- AUTHENTICATION ---
        'api/v1/drivers/auth/register': {
            post: {
                summary: 'Register a new driver',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password', 'firstName', 'lastName', 'phoneNumber', 'licenseNumber', 'vehicleType', 'vehiclePlate'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', format: 'password', minLength: 8 },
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' },
                                    phoneNumber: { type: 'string', description: 'Phone number without country code, e.g., 8012345678' },
                                    licenseNumber: { type: 'string' },
                                    vehicleType: { type: 'string', enum: ['SEDAN', 'SUV', 'TRUCK'] },
                                    vehicleMake: { type: 'string' },
                                    vehicleModel: { type: 'string' },
                                    vehicleYear: { type: 'number' },
                                    vehiclePlate: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': { 
                        description: 'Driver registered successfully. Verification email sent.',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object', 
                                            properties: { 
                                                driver: { $ref: '#/components/schemas/DriverProfile' }, 
                                                token: { type: 'string' } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        }
                    },
                    '400': { description: 'Validation failed.' },
                    '409': { description: 'Driver already exists with this email.' }
                }
            }
        },
        'api/v1/drivers/auth/login': {
            post: {
                summary: 'Log in a driver',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', format: 'password' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': { 
                        description: 'Login successful. Returns driver data and a token.',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object', 
                                            properties: { 
                                                driver: { $ref: '#/components/schemas/DriverProfile' }, 
                                                token: { type: 'string' } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Invalid email or password, or account deactivated.' },
                    '403': { description: 'Email not verified.' }
                }
            }
        },
        'api/v1/drivers/auth/verify-email': {
            post: {
                summary: 'Verify driver\'s email using a token',
                tags: ['Authentication'],
                requestBody: { 
                    required: true, 
                    content: { 
                        'application/json': { 
                            schema: { 
                                type: 'object', 
                                required: ['token'], 
                                properties: { token: { type: 'string' } } 
                            } 
                        } 
                    } 
                },
                responses: {
                    '200': { description: 'Email successfully verified.' },
                    '400': { description: 'Invalid verification token or email already verified.' }
                }
            }
        },
        'api/v1/drivers/auth/forgot-password': {
            post: {
                summary: 'Request a password reset link',
                tags: ['Authentication'],
                requestBody: { 
                    required: true, 
                    content: { 
                        'application/json': { 
                            schema: { 
                                type: 'object', 
                                required: ['email'], 
                                properties: { email: { type: 'string', format: 'email' } } 
                            } 
                        } 
                    } 
                },
                responses: { 
                    '200': { 
                        description: 'Password reset email sent (or notification sent, if email not found).' 
                    } 
                }
            }
        },
        'api/v1/drivers/auth/reset-password': {
            post: {
                summary: 'Reset password using the reset token',
                tags: ['Authentication'],
                requestBody: { 
                    required: true, 
                    content: { 
                        'application/json': { 
                            schema: { 
                                type: 'object', 
                                required: ['token', 'password'], 
                                properties: { 
                                    token: { type: 'string' }, 
                                    password: { type: 'string', format: 'password', minLength: 8 } 
                                } 
                            } 
                        } 
                    } 
                },
                responses: {
                    '200': { description: 'Password reset successfully.' },
                    '400': { description: 'Invalid or expired reset token.' }
                }
            }
        },
        
        // --- DASHBOARD ROUTES (NEW) ---
        'api/v1/drivers/dashboard': {
            get: {
                summary: 'Get driver dashboard overview',
                tags: ['Dashboard'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { 
                        description: 'Dashboard data retrieved successfully',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { $ref: '#/components/schemas/Dashboard' }
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' },
                    '500': { description: 'Internal server error.' }
                }
            }
        },
        
        'api/v1/drivers/trips': {
            get: {
                summary: 'Get driver\'s trip history with pagination',
                tags: ['Dashboard', 'Trips'],
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'page',
                        schema: { type: 'number', default: 1 },
                        description: 'Page number'
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: { type: 'number', default: 10 },
                        description: 'Number of trips per page'
                    },
                    {
                        in: 'query',
                        name: 'status',
                        schema: { 
                            type: 'string', 
                            enum: ['all', 'completed', 'cancelled', 'in_progress'] 
                        },
                        description: 'Filter by trip status'
                    },
                    {
                        in: 'query',
                        name: 'startDate',
                        schema: { type: 'string', format: 'date' },
                        description: 'Filter trips from this date (YYYY-MM-DD)'
                    },
                    {
                        in: 'query',
                        name: 'endDate',
                        schema: { type: 'string', format: 'date' },
                        description: 'Filter trips until this date (YYYY-MM-DD)'
                    }
                ],
                responses: {
                    '200': { 
                        description: 'Trips retrieved successfully',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { $ref: '#/components/schemas/TripList' }
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' },
                    '500': { description: 'Internal server error.' }
                }
            }
        },
        
        'api/v1/drivers/earnings': {
            get: {
                summary: 'Get driver earnings and transaction history',
                tags: ['Dashboard'],
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'timeRange',
                        schema: { 
                            type: 'string', 
                            enum: ['today', 'week', 'month', 'year', 'all'],
                            default: 'month'
                        },
                        description: 'Time range for earnings data'
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: { type: 'number', default: 20 },
                        description: 'Number of transactions to return'
                    }
                ],
                responses: {
                    '200': { 
                        description: 'Earnings data retrieved successfully',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { $ref: '#/components/schemas/Earnings' }
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' },
                    '500': { description: 'Internal server error.' }
                }
            }
        },
        
        'api/v1/drivers/active-trip': {
            get: {
                summary: 'Get driver\'s current active trip',
                tags: ['Dashboard', 'Trips'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { 
                        description: 'Active trip retrieved successfully',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { $ref: '#/components/schemas/ActiveTrip' }
                                    } 
                                } 
                            } 
                        }
                    },
                    '404': { description: 'No active trip found.' },
                    '401': { description: 'Unauthorized.' },
                    '500': { description: 'Internal server error.' }
                }
            }
        },
        
        'api/v1/drivers/completed-trips': {
            get: {
                summary: 'Get driver\'s completed trips',
                tags: ['Dashboard', 'Trips'],
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        in: 'query',
                        name: 'page',
                        schema: { type: 'number', default: 1 },
                        description: 'Page number'
                    },
                    {
                        in: 'query',
                        name: 'limit',
                        schema: { type: 'number', default: 10 },
                        description: 'Number of trips per page'
                    }
                ],
                responses: {
                    '200': { 
                        description: 'Completed trips retrieved successfully',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { $ref: '#/components/schemas/TripList' }
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' },
                    '500': { description: 'Internal server error.' }
                }
            }
        },
        
        'api/v1/drivers/trips/{tripId}': {
            get: {
                summary: 'Get detailed information about a specific trip',
                tags: ['Dashboard', 'Trips'],
                security: [{ bearerAuth: [] }],
                parameters: [
                    { 
                        in: 'path', 
                        name: 'tripId', 
                        required: true, 
                        schema: { type: 'string' }, 
                        description: 'The unique ID of the trip' 
                    }
                ],
                responses: {
                    '200': { 
                        description: 'Trip details retrieved successfully',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object',
                                            properties: {
                                                trip: { $ref: '#/components/schemas/TripDetails' },
                                                payment_info: {
                                                    type: 'object',
                                                    properties: {
                                                        fare: { type: 'number', format: 'float' },
                                                        driver_earnings: { type: 'number', format: 'float' },
                                                        commission: { type: 'number', format: 'float' },
                                                        payment_status: { type: 'string' },
                                                        paid_at: { type: 'string', format: 'date-time' }
                                                    }
                                                },
                                                route_info: {
                                                    type: 'object',
                                                    properties: {
                                                        distance_km: { type: 'number', format: 'float' },
                                                        duration_minutes: { type: 'number' },
                                                        pickup_coordinates: {
                                                            type: 'object',
                                                            properties: {
                                                                lat: { type: 'number', format: 'float' },
                                                                lng: { type: 'number', format: 'float' }
                                                            }
                                                        },
                                                        dropoff_coordinates: {
                                                            type: 'object',
                                                            properties: {
                                                                lat: { type: 'number', format: 'float' },
                                                                lng: { type: 'number', format: 'float' }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } 
                                } 
                            } 
                        }
                    },
                    '404': { description: 'Trip not found.' },
                    '401': { description: 'Unauthorized.' }
                }
            }
        },
        
        // --- PROFILE & DETAILS ---
        'api/v1/drivers/me': {
            get: {
                summary: 'Get current authenticated driver\'s profile',
                tags: ['Profile & Details'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { 
                        description: 'Driver profile retrieved successfully.',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object', 
                                            properties: { 
                                                driver: { $ref: '#/components/schemas/DriverProfile' } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' },
                    '404': { description: 'Driver not found.' }
                }
            }
        },
        'api/v1/drivers/{id}': {
            get: {
                summary: 'Get a driver\'s public profile by ID',
                tags: ['Profile & Details'],
                parameters: [
                    { 
                        in: 'path', 
                        name: 'id', 
                        required: true, 
                        schema: { type: 'string' }, 
                        description: 'The unique ID of the driver.' 
                    }
                ],
                responses: {
                    '200': { 
                        description: 'Driver details retrieved successfully.',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object', 
                                            properties: { 
                                                driver: { $ref: '#/components/schemas/DriverProfile' } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        }
                    },
                    '404': { description: 'Driver not found.' }
                }
            }
        },
        
        // --- LOCATION & AVAILABILITY ---
        'api/v1/drivers/availability': {
            get: {
                summary: 'Get the current availability status',
                tags: ['Location & Availability'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { 
                        description: 'Availability status retrieved.',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object', 
                                            properties: { 
                                                isAvailable: { type: 'boolean' } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' }
                }
            },
            patch: {
                summary: 'Update the driver\'s availability status (online/offline)',
                tags: ['Location & Availability'],
                security: [{ bearerAuth: [] }],
                requestBody: { 
                    required: true, 
                    content: { 
                        'application/json': { 
                            schema: { 
                                type: 'object', 
                                required: ['isAvailable'], 
                                properties: { isAvailable: { type: 'boolean' } } 
                            } 
                        } 
                    } 
                },
                responses: {
                    '200': { description: 'Availability status updated successfully.' },
                    '400': { description: 'Validation failed.' },
                    '401': { description: 'Unauthorized.' }
                }
            }
        },
        'api/v1/drivers/location': {
            post: {
                summary: 'Update the driver\'s current location, heading, and speed',
                tags: ['Location & Availability'],
                security: [{ bearerAuth: [] }],
                requestBody: { 
                    required: true, 
                    content: { 
                        'application/json': { 
                            schema: { $ref: '#/components/schemas/Location' } 
                        } 
                    } 
                },
                responses: {
                    '200': { 
                        description: 'Location updated successfully.',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object', 
                                            properties: { 
                                                location: { $ref: '#/components/schemas/Location' } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' }
                }
            },
            get: {
                summary: 'Get the current location of the authenticated driver',
                tags: ['Location & Availability'],
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { 
                        description: 'Location retrieved successfully.',
                        content: { 
                            'application/json': { 
                                schema: { 
                                    type: 'object', 
                                    properties: { 
                                        success: { type: 'boolean' }, 
                                        data: { 
                                            type: 'object', 
                                            properties: { 
                                                location: { $ref: '#/components/schemas/Location' } 
                                            } 
                                        } 
                                    } 
                                } 
                            } 
                        }
                    },
                    '401': { description: 'Unauthorized.' },
                    '404': { description: 'Location data not found.' }
                }
            }
        }
    }
};

const options: Options = {
    definition: swaggerDefinition, 
    apis: [] 
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;