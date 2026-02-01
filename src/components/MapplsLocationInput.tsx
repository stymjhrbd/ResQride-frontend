import React, { useEffect, useRef, useState } from 'react';
import { Input } from './ui/input';
import { Loader2 } from 'lucide-react';

interface MapplsLocationInputProps {
  onLocationSelect: (location: string) => void;
  defaultValue?: string;
  className?: string;
}

declare global {
  interface Window {
    mappls: any;
  }
}

export const MapplsLocationInput: React.FC<MapplsLocationInputProps> = ({
  onLocationSelect,
  defaultValue = '',
  className
}) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useRef(`mappls-search-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const loadMapplsScript = () => {
      // Remove quotes if they exist in the env variable (common mistake)
      const rawKey = import.meta.env.VITE_MAPPLS_API_KEY || '';
      const apiKey = rawKey.replace(/"/g, '');

      console.log('Mappls: Loading SDK with key length:', apiKey?.length);

      if (!apiKey || apiKey === 'your_mappls_api_key_here') {
        setError('MapMyIndia API Key is missing in .env');
        return;
      }

      if (window.mappls) {
        setScriptLoaded(true);
        return;
      }

      // Load Main SDK
      const script = document.createElement('script');
      // Use the vector map SDK URL which is more stable for search components
      // IMPORTANT: URL encode the key to handle special characters like '+' or '='
      // Also trying the alternate endpoint which is sometimes required for newer keys
      script.src = `https://apis.mappls.com/advancedmaps/api/${encodeURIComponent(apiKey)}/map_sdk?layer=vector&v=3.0`;
      script.async = true;
      script.defer = true;

      // Load Plugins (for Autosuggest)
      const pluginScript = document.createElement('script');
      pluginScript.src = `https://apis.mappls.com/advancedmaps/api/${encodeURIComponent(apiKey)}/map_sdk_plugins?v=3.0`;
      pluginScript.async = true;
      pluginScript.defer = true;

      // Add callback support which is required by some versions of the SDK
      (window as any).initMap1 = () => {
        console.log('Mappls: SDK Callback fired');
        setScriptLoaded(true);
      };

      script.onload = () => {
        console.log('Mappls: Main SDK Loaded');
        pluginScript.onload = () => {
          console.log('Mappls: Plugin SDK Loaded');
          setScriptLoaded(true);
        };
        pluginScript.onerror = (e) => {
          console.error('Mappls: Plugin Load Error', e);
          setError('Failed to load MapMyIndia Plugins');
        };
        document.body.appendChild(pluginScript);
      };

      script.onerror = (e) => {
        console.error('Mappls: SDK Load Error', e);
        // Fallback: Try loading the non-vector SDK which sometimes works for older keys
        console.log('Mappls: Retrying with standard SDK endpoint...');
        const fallbackScript = document.createElement('script');
        fallbackScript.src = `https://apis.mappls.com/advancedmaps/api/${encodeURIComponent(apiKey)}/map_sdk?v=3.0`;
        fallbackScript.async = true;
        fallbackScript.defer = true;

        fallbackScript.onload = () => {
          console.log('Mappls: Fallback SDK Loaded');
          document.body.appendChild(pluginScript);
        };

        fallbackScript.onerror = () => {
          setError('Map loading failed. Please enter location manually.');
        };

        document.body.appendChild(fallbackScript);
      };
      document.body.appendChild(script);
    };

    loadMapplsScript();
  }, []);

  useEffect(() => {
    if (scriptLoaded && window.mappls) {
      const element = document.getElementById(inputId.current);
      if (!element) {
        console.error('Mappls: Input element not found in DOM');
        return;
      }

      console.log('Mappls: Initializing search widget on', inputId.current);

      const options = {
        divId: inputId.current,
        fitbounds: false,
        submit: true,
        api: 'autosuggest', // Using autosuggest API
      };

      try {
        // Initialize the search widget
        // Note: The exact syntax depends on the plugin version, this is the standard v3 implementation
        if (window.mappls.search) {
          new window.mappls.search(document.getElementById(inputId.current), options, (data: any) => {
            if (data && data[0]) {
              console.log('Mappls: Location selected', data[0]);
              // Data format usually contains 'eLoc', 'placeName', 'placeAddress'
              const address = data[0].placeName + (data[0].placeAddress ? `, ${data[0].placeAddress}` : '');
              onLocationSelect(address);
            }
          });
        } else {
          console.error('Mappls: window.mappls.search is undefined. Plugin might not be loaded.');
          setError('Map SDK loaded but Search plugin missing');
        }

      } catch (e) {
        console.error('Error initializing Mappls search:', e);
      }
    }
  }, [scriptLoaded, onLocationSelect]);

  return (
    <div className="relative w-full">
      {error && (
        <div className="text-red-500 text-xs mb-1">{error}</div>
      )}

      {!scriptLoaded && !error && (
        <div className="absolute right-3 top-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}

      {/* The input element that Mappls will attach to */}
      <Input
        id={inputId.current}
        defaultValue={defaultValue}
        placeholder="Search for a location..."
        className={`${className} ${!scriptLoaded ? 'bg-gray-50' : ''}`}
        onChange={(e) => onLocationSelect(e.target.value)} // Fallback for manual typing
      />
    </div>
  );
};
