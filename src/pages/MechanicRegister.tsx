import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Wrench } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../api/client';

const mechanicSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phoneNo: z.string().min(10, 'Phone number must be at least 10 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.literal('MECHANIC'),
  skillType: z.string().min(1, "Skill type is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type MechanicFormData = z.infer<typeof mechanicSchema>;

export const MechanicRegister: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<MechanicFormData>({
    resolver: zodResolver(mechanicSchema),
    defaultValues: { role: 'MECHANIC' }
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: MechanicFormData) => {
    setIsLoading(true);
    try {
      await apiClient.post('/mechanics/register', {
        email: data.email,
        name: data.fullName,
        phone: data.phoneNo,
        password: data.password,
        skillType: data.skillType
      });

      toast.success('Mechanic account created successfully! Please sign in.');
      navigate('/login');
    } catch (error: any) {
      console.error('Registration failed:', error);
      if (error.response?.status === 409) {
        toast.error('An account with this email already exists. Please sign in.');
      } else {
        toast.error(error.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Wrench className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Mechanic Registration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join our network of professionals. <br />
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register('fullName')} className={errors.fullName ? 'border-red-500' : ''} />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phoneNo">Phone Number</Label>
              <Input id="phoneNo" type="tel" {...register('phoneNo')} className={errors.phoneNo ? 'border-red-500' : ''} />
              {errors.phoneNo && <p className="text-red-500 text-xs mt-1">{errors.phoneNo.message}</p>}
            </div>
            <div>
              <Label htmlFor="skillType">Skill Type</Label>
              <select id="skillType" {...register('skillType')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border">
                <option value="">Select your skill...</option>
                <option value="GENERAL_MECHANIC">General Mechanic</option>
                <option value="TOWING">Towing Specialist</option>
                <option value="TIRE_SPECIALIST">Tire Specialist</option>
                <option value="BATTERY_EXPERT">Battery Expert</option>
                <option value="LOCKSMITH">Locksmith</option>
              </select>
              {errors.skillType && <p className="text-red-500 text-xs mt-1">{errors.skillType.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} className={errors.password ? 'border-red-500' : ''} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} className={errors.confirmPassword ? 'border-red-500' : ''} />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>
          <Button type="submit" className="w-full flex justify-center" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Mechanic Account...</> : 'Create Mechanic Account'}
          </Button>
        </form>
      </div>
    </div>
  );
};