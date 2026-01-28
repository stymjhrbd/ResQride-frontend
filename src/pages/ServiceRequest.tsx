import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../api/client';

const serviceRequestSchema = z.object({
  location: z.string().min(5, 'Please enter a valid location'),
  problemType: z.string().min(1, 'Please select a problem type'),
  amount: z.coerce.number().min(0, 'Amount must be non-negative'),
});

export const ServiceRequest: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(serviceRequestSchema),
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: unknown) => {
    setIsLoading(true);
    try {
      const parsed = serviceRequestSchema.parse(data);
      await apiClient.post('/requests', {
        location: parsed.location,
        problemType: parsed.problemType,
        amount: parsed.amount,
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
                <option value="TOWING">Towing</option>
                <option value="TIRE_CHANGE">Flat Tire Change</option>
                <option value="BATTERY">Battery Jump Start</option>
                <option value="FUEL">Fuel Delivery</option>
                <option value="LOCKOUT">Lockout</option>
                <option value="MECHANIC">General Mechanic</option>
              </select>
              {errors.problemType && (
                <p className="text-red-500 text-xs mt-1">{errors.problemType.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Current Location</Label>
              <div className="relative">
                <Input
                  id="location"
                  placeholder="e.g., 123 Highway 101, Near Exit 5"
                  {...register('location')}
                  className={errors.location ? 'border-red-500 pl-10' : 'pl-10'}
                />
                <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="amount">Estimated Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount')}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
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
