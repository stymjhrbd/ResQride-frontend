import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, MapPin, Building2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../api/client';
import { MapplsLocationInput } from '../components/MapplsLocationInput';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

// Schema for creating a center
const centerSchema = z.object({
  name: z.string().min(3, 'Center name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  maxMechanicsPerSkill: z.coerce.number().min(1, 'At least 1 mechanic per skill'),
  latitude: z.number(),
  longitude: z.number(),
});

type CenterFormData = z.infer<typeof centerSchema>;

interface Center {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  maxMechanicsPerSkill: number;
  isActive: boolean;
}

export const AdminCenters: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CenterFormData>({
    // @ts-ignore - resolver type mismatch due to zod version
    resolver: zodResolver(centerSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      maxMechanicsPerSkill: 1
    }
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    fetchCenters();
  }, [isAuthenticated, user, navigate]);

  const fetchCenters = async () => {
    try {
      // Try the mechanic service endpoint first (preferred)
      const res = await apiClient.get('/mechanics/centers');
      setCenters(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.warn('Failed to fetch /mechanics/centers, trying /admin/centers fallback...');
      try {
        const resFallback = await apiClient.get('/admin/centers');
        setCenters(Array.isArray(resFallback.data) ? resFallback.data : []);
      } catch (e) {
        console.error('Failed to fetch centers (both endpoints):', e);
        // Don't show error toast immediately on load to avoid spamming if backend is down
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CenterFormData) => {
    setIsCreating(true);
    try {
      await apiClient.post('/centers', data);
      toast.success('Center created successfully!');
      setShowCreateForm(false);
      reset();
      fetchCenters();
    } catch (error) {
      console.error('Failed to create center:', error);
      toast.error('Failed to create center');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Service Centers
        </h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Center
            </>
          )}
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add New Service Center</h2>
          {/* @ts-ignore - submit handler type mismatch */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Center Name</Label>
                <Input id="name" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} className={errors.city ? 'border-red-500' : ''} />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="location">Location & Address</Label>
                <MapplsLocationInput
                  className={errors.address ? 'border-red-500' : ''}
                  onLocationSelect={(loc, coords) => {
                    setValue('address', loc);
                    if (coords) {
                      setValue('latitude', coords.lat);
                      setValue('longitude', coords.lng);
                    }
                  }}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                {errors.latitude && <p className="text-red-500 text-xs mt-1">Please select a location from the dropdown</p>}
              </div>

              <div>
                <Label htmlFor="maxMechanicsPerSkill">Max Mechanics Per Skill</Label>
                <Input
                  id="maxMechanicsPerSkill"
                  type="number"
                  {...register('maxMechanicsPerSkill')}
                  className={errors.maxMechanicsPerSkill ? 'border-red-500' : ''}
                />
                {errors.maxMechanicsPerSkill && <p className="text-red-500 text-xs mt-1">{errors.maxMechanicsPerSkill.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Center'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity (Per Skill)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {centers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No centers found.</td>
                </tr>
              ) : (
                centers.map((center) => (
                  <tr key={center.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{center.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{center.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{center.city}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={center.address}>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                        {center.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{center.maxMechanicsPerSkill}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Default to Active if isActive is undefined/null */}
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${center.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {center.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
