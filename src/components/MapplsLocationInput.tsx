import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Loader2, MapPin } from 'lucide-react';

interface MapplsLocationInputProps {
  onLocationSelect: (location: string, coords?: { lat: number; lng: number }) => void;
  defaultValue?: string;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const MapplsLocationInput: React.FC<MapplsLocationInputProps> = ({
  onLocationSelect,
  defaultValue = '',
  className
}) => {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      // If query matches the default value or user just selected something, don't search
      // (This is a simplified check, ideally we track "selection mode")

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('OSM Search Error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: NominatimResult) => {
    setQuery(result.display_name);
    setShowSuggestions(false);
    onLocationSelect(result.display_name, {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onLocationSelect(e.target.value); // Allow manual typing without coords
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder="Search for a location..."
          className={className}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((result) => (
            <li
              key={result.place_id}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-b-0 flex items-start"
              onClick={() => handleSelect(result)}
            >
              <MapPin className="h-4 w-4 mt-0.5 mr-2 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">{result.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
