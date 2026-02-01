import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { MapPin, Loader2, Navigation, CheckCircle } from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface AssignedJob {
    requestId: number;
    problemType: string;
    location: string;
    amount: number;
    status: string;
    createdAt?: string;
    customer?: { name?: string; phone?: string } | null;
}

export const MechanicDashboard: React.FC = () => {
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<AssignedJob[]>([]);
    const [availability, setAvailability] = useState<string>('OFFLINE');
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'MECHANIC') {
            navigate('/login');
            return;
        }
        const fetchJobs = async () => {
            try {
                const [jobsRes, meRes] = await Promise.all([
                    apiClient.get('/mechanics/my-requests'),
                    apiClient.get('/mechanics/me').catch(() => ({ data: { availability: 'UNKNOWN' } })) // Fallback
                ]);
                // Sort jobs by ID (descending)
                const sortedJobs = Array.isArray(jobsRes.data) ? jobsRes.data.sort((a: AssignedJob, b: AssignedJob) => b.requestId - a.requestId) : [];
                setJobs(sortedJobs);
                if (meRes.data.availability) {
                    setAvailability(meRes.data.availability);
                }
            } catch {
                setError('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchJobs();
    }, [isAuthenticated, user, navigate]);

    const updateLocation = () => {
        if (!navigator.geolocation) {
            // Using alert instead of toast for now since toast import might be missing in this file scope
            // or we can add it if needed. Assuming toast is available globally or we add import.
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsUpdatingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Reverse geocode to get address (optional but good for display)
                    let address = 'Unknown Location';
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        if (data && data.display_name) address = data.display_name;
                    } catch (e) {
                        console.warn('Reverse geocoding failed', e);
                    }

                    await apiClient.patch('/mechanics/location', null, {
                        params: {
                            latitude,
                            longitude,
                            address
                        }
                    });

                    // Simple success feedback
                    const btn = document.getElementById('update-loc-btn');
                    if (btn) btn.innerText = 'Updated!';
                    setTimeout(() => {
                        if (btn) btn.innerText = 'Update Location';
                    }, 2000);

                } catch (e) {
                    console.error('Failed to update location', e);
                    setError('Failed to sync location to server');
                } finally {
                    setIsUpdatingLocation(false);
                }
            },
            (err) => {
                console.error('Geolocation error', err);
                setIsUpdatingLocation(false);
                setError('Unable to retrieve location');
            }
        );
    };

    const updateAvailability = async (status: string) => {
        try {
            await apiClient.patch(`/mechanics/availability?status=${status}`);
            setAvailability(status);
        } catch {
            // setError('Failed to update availability'); // Optional: show toast instead
            console.error('Failed to update availability');
        }
    };

    const completeJob = async (id: number) => {
        try {
            // Update status to PAYMENT_PENDING instead of COMPLETED
            await apiClient.patch(`/requests/${id}/status?status=PAYMENT_PENDING`);
            const updated = jobs.map(j =>
                j.requestId === id ? { ...j, status: 'PAYMENT_PENDING' } : j
            );
            setJobs(updated);

            // Availability is NOT updated here, it stays BUSY until payment is done (or mechanic manually updates it)
            // Or if you prefer, mechanic becomes AVAILABLE now waiting for payment.
            // Requirement says "after clicking on pay ... i want complete status".
            // So mechanic sets it to PAYMENT_PENDING.

            updateAvailability('AVAILABLE'); // Mechanic is free technically, just waiting for payment
        } catch {
            setError('Failed to update job status');
        }
    };

    const openMaps = (location: string) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        window.open(url, '_blank');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-red-700">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Mechanic Dashboard</h1>

                <div className="flex items-center gap-2">
                    <Button
                        id="update-loc-btn"
                        variant="outline"
                        size="sm"
                        onClick={updateLocation}
                        disabled={isUpdatingLocation}
                        className="mr-2"
                    >
                        {isUpdatingLocation ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                            <MapPin className="h-4 w-4 mr-1" />
                        )}
                        {isUpdatingLocation ? 'Updating...' : 'Update Location'}
                    </Button>

                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <select
                        value={availability}
                        onChange={(e) => updateAvailability(e.target.value)}
                        className={`text-sm font-semibold py-1 px-3 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${availability === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                            availability === 'BUSY' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}
                    >
                        <option value="AVAILABLE" className="bg-white text-gray-900">Available</option>
                        <option value="BUSY" className="bg-white text-gray-900">Busy</option>
                        <option value="OFFLINE" className="bg-white text-gray-900">Offline</option>
                    </select>
                </div>
            </div>

            <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No jobs assigned.</td>
                                </tr>
                            ) : (
                                jobs.map((job, index) => (
                                    <tr key={`${job.requestId}-${index}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.requestId}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.problemType}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                                {job.location}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.amount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.status === 'COMPLETED'
                                                ? 'bg-green-100 text-green-800'
                                                : job.status === 'CANCELLED'
                                                    ? 'bg-red-100 text-red-800'
                                                    : job.status === 'IN_PROGRESS' || job.status === 'ASSIGNED'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {job.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openMaps(job.location)}>
                                                    <Navigation className="mr-2 h-4 w-4" />
                                                    Navigate
                                                </Button>
                                                {(job.status === 'IN_PROGRESS' || job.status === 'ASSIGNED') && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => completeJob(job.requestId)}
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Done
                                                    </Button>
                                                )}
                                            </div>
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
