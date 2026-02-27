'use client';

export default function EmergencyButton() {
  const handleEmergency = () => {
    if (window.confirm('Are you sure you want to trigger an emergency alert?')) {
      alert('Emergency alert has been sent to authorities and your emergency contacts.');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-10">
      <button 
        onClick={handleEmergency}
        className="bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.28 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="ml-2 font-semibold">Emergency</span>
      </button>
    </div>
  );
}