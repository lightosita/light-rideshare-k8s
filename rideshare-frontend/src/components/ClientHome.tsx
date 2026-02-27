
'use client';
import Image from 'next/image';

export default function ClientHome() {

  return (
    <div className="relative h-screen w-full flex flex-col justify-center items-center text-center p-5">
      <Image
        src="https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
        alt="Background"
        fill
        style={{ objectFit: 'cover' }}
        quality={80}
        priority
      />
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 text-white drop-shadow-lg">
          Swift<span className="text-blue-600">Ride</span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-white drop-shadow-md">
          Your journey, our priority
        </p>
      
      </div>
    </div>
  );
}