import MapboxAutocomplete from "../../maps/MapboxAutocomplete";


interface LocationInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: any) => void;
  placeholder: string;
}

export default function LocationInput({
  label,
  value,
  onChange,
  onPlaceSelect,
  placeholder
}: LocationInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <MapboxAutocomplete
        value={value}
        onChange={onChange}
        onPlaceSelect={onPlaceSelect}
        placeholder={placeholder}
      />
    </div>
  );
}