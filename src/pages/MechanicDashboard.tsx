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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'MECHANIC') {
            navigate('/login');
            return;
        }
        const fetchJobs = async () => {
            try {
                const res = await apiClient.get('/mechanics/my-requests');
                setJobs(res.data);
            } catch {
                setError('Failed to load assigned jobs');
            } finally {
                setIsLoading(false);
            }
        };
        fetchJobs();
    }, [isAuthenticated, user, navigate]);

    const completeJob = async (id: number) => {
        try {
            await apiClient.patch(`/requests/${id}/status?status=COMPLETED`);
            const updated = jobs.map(j =>
                j.requestId === id ? { ...j, status: 'COMPLETED' } : j
            );
            setJobs(updated);
        } catch {
            setError('Failed to complete job');
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
