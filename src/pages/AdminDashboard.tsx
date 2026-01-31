import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MapPin, Loader2, Eye, X, Users } from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

interface RequestItem {
  requestId: number;
  location: string;
  problemType: string;
  amount: number;
  status: string;
  createdAt?: string;
  mechanic?: { id: number; name: string } | null;
  mechanicId?: number;
  mechanicName?: string;
}

interface Mechanic {
  id: number;
  name: string;
  verified?: boolean;
  availability?: string;
  email?: string;
  phone?: string;
}

export const AdminDashboard: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMechanic, setFeedbackMechanic] = useState<Mechanic | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<Array<{ id?: number; rating?: number; comment?: string; createdAt?: string }>>([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    const fetchData = async () => {
      try {
        // Fetch pending requests and available mechanics
        const [reqRes, mechRes] = await Promise.all([
          apiClient.get('/admin/requests'),
          apiClient.get('/admin/mechanics/available'),
        ]);
        // Sort requests by ID (descending)
        const sortedRequests = Array.isArray(reqRes.data) ? reqRes.data.sort((a: RequestItem, b: RequestItem) => b.requestId - a.requestId) : [];
        setRequests(sortedRequests);

        // Ensure mechanics is an array
        const availableMechanics = Array.isArray(mechRes.data) ? mechRes.data : [];
        setMechanics(availableMechanics);
      } catch (err) {
        setError('Failed to load admin data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, user, navigate]);

  const assignRequest = async (requestId: number) => {
    const mechanicId = selection[requestId];
    if (!mechanicId) return;
    setAssigningId(requestId);
    try {
      await apiClient.patch('/admin/assign', undefined, {
        params: { requestId, mechanicId },
      });
      const updated = requests.map(r =>
        r.requestId === requestId
          ? { ...r, mechanic: mechanics.find(m => m.id === mechanicId) || null, status: 'IN_PROGRESS' }
          : r
      );
      setRequests(updated);
    } catch {
      setError('Failed to assign request');
    } finally {
      setAssigningId(null);
    }
  };

  const cancelRequest = async (requestId: number) => {
    try {
      await apiClient.patch(`/requests/${requestId}/status?status=CANCELLED`);
      const updated = requests.map(r =>
        r.requestId === requestId ? { ...r, status: 'CANCELLED' } : r
      );
      setRequests(updated);
    } catch {
      setError('Failed to cancel request');
    }
  };

  const openFeedback = async (mechanic: Mechanic) => {
    setFeedbackMechanic(mechanic);
    setFeedbackLoading(true);
    setFeedbackOpen(true);
    try {
      const res = await apiClient.get(`/admin/feedback/mechanic/${mechanic.id}`);
      setFeedbackItems(res.data || []);
    } catch {
      setError('Failed to load mechanic feedback');
      setFeedbackItems([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAYMENT_PENDING':
        return 'Unassigned';
      case 'CREATED':
        return 'Unassigned';
      default:
        return status.replace('_', ' ');
    }
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
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link to="/admin/mechanics">
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Manage Mechanics
          </Button>
        </Link>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">No requests found.</td>
                </tr>
              ) : (
                requests.map((r, index) => (
                  <tr key={`${r.requestId}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.requestId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.problemType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {r.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : r.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.mechanic?.name || r.mechanicName || (r.mechanicId ? `Mechanic ID: ${r.mechanicId}` : 'Unassigned')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded-md px-2 py-1 text-sm"
                          value={selection[r.requestId] || ''}
                          onChange={(e) =>
                            setSelection((prev) => ({ ...prev, [r.requestId]: Number(e.target.value) }))
                          }
                        >
                          <option value="">Select mechanic</option>
                          {mechanics.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <Button
                          disabled={
                            !!r.mechanic ||
                            r.status === 'IN_PROGRESS' ||
                            r.status === 'ASSIGNED' ||
                            !selection[r.requestId] ||
                            assigningId === r.requestId
                          }
                          onClick={() => assignRequest(r.requestId)}
                        >
                          {assigningId === r.requestId ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Assigning...
                            </>
                          ) : !!r.mechanic || r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED' ? (
                            'Assigned'
                          ) : (
                            'Assign'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => cancelRequest(r.requestId)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Mechanics</h2>
          {mechanics.length === 0 ? (
            <p className="text-gray-500 text-sm">No mechanics available.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mechanics.map((m) => (
                <div key={m.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">ID: {m.id}</p>
                  </div>
                  <Button variant="outline" onClick={() => openFeedback(m)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Feedback
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {feedbackOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Feedback for {feedbackMechanic?.name}</h3>
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={() => setFeedbackOpen(false)}
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4">
              {feedbackLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : feedbackItems.length === 0 ? (
                <p className="text-sm text-gray-500">No feedback found.</p>
              ) : (
                <ul className="space-y-3">
                  {feedbackItems.map((f, idx) => (
                    <li key={f.id ?? idx} className="border rounded p-3">
                      <p className="text-sm text-gray-900">{f.comment || 'No comment'}</p>
                      <p className="text-xs text-gray-500">Rating: {f.rating ?? 'N/A'} | {f.createdAt?.split('T')[0] ?? ''}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
