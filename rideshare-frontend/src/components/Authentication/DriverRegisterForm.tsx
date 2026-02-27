
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';



export default function DriverRegisterForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    licenseNumber: '',
    vehicleType: 'SEDAN',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
   const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'phoneNumber' ? value.replace(/\D/g, '') : value,
    }));
  };


 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_DRIVER_SERVICE_URL}/api/v1/drivers/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber, 
        password: formData.password,
        licenseNumber: formData.licenseNumber,
        vehicleType: formData.vehicleType,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleYear: parseInt(formData.vehicleYear),
        vehiclePlate: formData.vehiclePlate,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Driver registration failed');
    }

    setRegisteredEmail(formData.email);
    setShowSuccessModal(true);
    
  } catch (err: any) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

  const handleCloseModal = () => {
    setShowSuccessModal(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Driver Registration</h2>
      <h2 className="text-sm text-gray-800 mb-6">
        Already have an account?{' '}
        <Link className="text-blue-500" href="/login">
          Login
        </Link>
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 flex items-center">
              <span className="h-full py-2 pl-3 pr-1 border-r border-gray-300 bg-gray-50 flex items-center justify-center text-gray-500 sm:text-sm">
                +234
              </span>
            </div>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              maxLength={10}
              placeholder="8012345678"
              className="block w-full pl-16 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Information</h3>

          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
              Driver&apos;s License Number
            </label>
            <input
              id="licenseNumber"
              name="licenseNumber"
              type="text"
              required
              value={formData.licenseNumber}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
            <div>
              <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">
                Vehicle Type
              </label>
              <select
                id="vehicleType"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="VAN">Van</option>
                <option value="LUXURY">Luxury</option>
                <option value="ELECTRIC">Electric</option>
              </select>
            </div>

            <div>
              <label htmlFor="vehicleMake" className="block text-sm font-medium text-gray-700">
                Vehicle Make
              </label>
              <input
                id="vehicleMake"
                name="vehicleMake"
                type="text"
                required
                value={formData.vehicleMake}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700">
                Vehicle Model
              </label>
              <input
                id="vehicleModel"
                name="vehicleModel"
                type="text"
                required
                value={formData.vehicleModel}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label htmlFor="vehicleYear" className="block text-sm font-medium text-gray-700">
                Vehicle Year
              </label>
              <input
                id="vehicleYear"
                name="vehicleYear"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                required
                value={formData.vehicleYear}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="vehiclePlate" className="block text-sm font-medium text-gray-700">
                License Plate Number
              </label>
              <input
                id="vehiclePlate"
                name="vehiclePlate"
                type="text"
                required
                value={formData.vehiclePlate}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center mt-4">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
            I agree to the{' '}
            <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">
              Privacy Policy
            </Link>
          </label>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
          >
            {isLoading ? 'Registering...' : 'Register as Driver'}
          </button>
        </div>
      </form>
       {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 mx-auto">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg 
                  className="h-6 w-6 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Registration Successful!
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                A verification email has been sent to:
              </p>
              
              <p className="text-sm font-medium text-blue-600 mb-6">
                {registeredEmail}
              </p>
              
              <p className="text-sm text-gray-500 mb-6">
                Please check your inbox and click the verification link to activate your account. 
                If you don't see the email, check your spam folder.
              </p>

              <div className="">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Continue
                </button>
             
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}