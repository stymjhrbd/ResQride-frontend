import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import { MapplsLocationInput } from '../components/MapplsLocationInput';

const serviceRequestSchema = z.object({
  location: z.string().min(5, 'Please enter a valid location'),
  problemType: z.string().min(1, 'Please select a problem type'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const SERVICE_PRICES: Record<string, number> = {
  'TOWING': 1500.00,
  'TIRE_CHANGE': 800.00,
  'BATTERY': 3000.00,
  'FUEL': 600.00,
  'LOCKOUT': 300.00,
  'MECHANIC': 1500.00
};

export const ServiceRequest: React.FC = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(serviceRequestSchema),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      toast.info('Please login to request assistance');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding (free, no key required)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          if (data && data.display_name) {
            setValue('location', data.display_name);
            setValue('latitude', latitude);
            setValue('longitude', longitude);
            toast.success('Location detected successfully');
          } else {
            // Fallback to coordinates if address not found
            setValue('location', `${latitude}, ${longitude}`);
            setValue('latitude', latitude);
            setValue('longitude', longitude);
            toast.success('Location coordinates detected');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Fallback to coordinates on network error
          setValue('location', `${latitude}, ${longitude}`);
          setValue('latitude', latitude);
          setValue('longitude', longitude);
          toast.warning('Could not fetch address, using coordinates');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Unable to retrieve your location');
        setIsLocating(false);
      }
    );
  };

  const onSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const parsed = serviceRequestSchema.parse(data);
      const amount = SERVICE_PRICES[parsed.problemType] || 0;

      await apiClient.post('/requests', {
        location: parsed.location,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        problemType: parsed.problemType,
        amount: amount,
      });

      toast.success('Service request submitted successfully! Searching for mechanics...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Request Roadside Assistance</h1>
          <p className="text-gray-600 mt-2">Fill out the details below to get immediate help.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Service Details</h2>

            <div>
              <Label htmlFor="problemType">Problem Type</Label>
              <select
                id="problemType"
                {...register('problemType')}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border"
              >
                <option value="">Select a service...</option>
                <option value="TOWING">Towing (₹1500)</option>
                <option value="TIRE_CHANGE">Flat Tire Change (₹800)</option>
                <option value="BATTERY">Battery Jump Start (₹3000)</option>
                <option value="FUEL">Fuel Delivery (₹600)</option>
                <option value="LOCKOUT">Lockout (₹300)</option>
                <option value="MECHANIC">General Mechanic (₹1500)</option>
              </select>
              {errors.problemType && (
                <p className="text-red-500 text-xs mt-1">{errors.problemType.message}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="location">Current Location</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLocationClick}
                  disabled={isLocating}
                  className="text-primary-600 hover:text-primary-700 h-8 px-2"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Locating...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3 mr-1" />
                      Use Current Location
                    </>
                  )}
                </Button>
              </div>
              <div className="relative">
                <MapplsLocationInput
                  className={errors.location ? 'border-red-500 pl-10' : 'pl-10'}
                  onLocationSelect={(loc, coords) => {
                    setValue('location', loc);
                    if (coords) {
                      setValue('latitude', coords.lat);
                      setValue('longitude', coords.lng);
                    }
                  }}
                />
                <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none z-10" />
              </div>
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>
              )}
            </div>
          </div>



          <div className="pt-6">
            <Button
              type="submit"
              className="w-full text-lg py-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
