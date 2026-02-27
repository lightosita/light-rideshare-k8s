'use client';
import { useState, useRef, useEffect } from 'react';

interface MapboxAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: any) => void;
  placeholder?: string;
  className?: string;
}

export default function MapboxAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter location",
  className = ""
}: MapboxAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions from Mapbox Geocoding API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&` +
        `country=ng&autocomplete=true&limit=5`
      );

      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  // Handle input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: any) => {
    const [longitude, latitude] = suggestion.center;
    const address = suggestion.place_name;

    onPlaceSelect({
      geometry: {
        location: { lat: latitude, lng: longitude }
      },
      formatted_address: address,
      ...suggestion
    });

    onChange(address);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id || index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-800">
                {suggestion.text}
              </div>
              <div className="text-xs text-gray-500">
                {suggestion.place_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}