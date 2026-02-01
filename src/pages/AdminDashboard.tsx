import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MapPin, Loader2, Eye, X, Users, Building2 } from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

interface RequestItem {
  requestId: number;
  location: string;
  latitude?: number;
  longitude?: number;
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
  rating?: number;
  skillType?: string;
  distance?: number;
}

export const AdminDashboard: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [skilledMechanics, setSkilledMechanics] = useState<Record<string, Mechanic[]>>({});
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMechanic, setFeedbackMechanic] = useState<Mechanic | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<Array<{ id?: number; rating?: number; comment?: string; createdAt?: string }>>([]);

  const mapProblemTypeToSkill = (problemType: string): string => {
    switch (problemType) {
      case 'TOWING': return 'TOWING';
      case 'TIRE_CHANGE': return 'TIRE_SPECIALIST';
      case 'BATTERY': return 'BATTERY_EXPERT';
      case 'LOCKOUT': return 'LOCKSMITH';
      case 'MECHANIC': return 'GENERAL_MECHANIC';
      case 'FUEL': return 'GENERAL_MECHANIC'; // Assuming general mechanics handle fuel
      default: return problemType;
    }
  };

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
          apiClient.get('/admin/mechanics/available')
            .catch(err => {
              console.error("Mechanics fetch failed:", err.response?.status, err.response?.data);
              return { data: [] };
            }),
        ]);
        // Sort requests by ID (descending)
        const sortedRequests = Array.isArray(reqRes.data) ? reqRes.data.sort((a: RequestItem, b: RequestItem) => b.requestId - a.requestId) : [];
        setRequests(sortedRequests);

        // Ensure mechanics is an array
        const availableMechanics = Array.isArray(mechRes.data) ? mechRes.data : [];
        setMechanics(availableMechanics);

        // Fetch mechanics by skill for each unique problem type
        const uniqueProblemTypes = Array.from(new Set(sortedRequests.map((r: RequestItem) => r.problemType)));
        const skillMap: Record<string, Mechanic[]> = {};

        await Promise.all(uniqueProblemTypes.map(async (type) => {
          try {
            if (!type) return;
            const skill = mapProblemTypeToSkill(type);

            // Find requests of this type to get coordinates (assuming they are grouped or we take the first pending one)
            // For a perfect match, we should fetch mechanics per request context, but for the dashboard overview,
            // we will try to find a representative location or default to general availability.
            // BETTER APPROACH: The dashboard shows a list of requests. When the user opens the dropdown for a SPECIFIC request,
            // we should probably fetch the nearest mechanics for THAT request's location.
            // However, to keep it simple and consistent with current architecture (bulk fetch),
            // we will stick to the existing "all available" logic for now, but update the dropdown interaction later if needed.
            // WAIT, the requirement is "Get nearest mechanics for admin... /nearest?lat=...".
            // Since we display a list of requests, each request has a DIFFERENT location.
            // So we cannot pre-fetch "nearest" mechanics globally unless we do it per request.

            // STRATEGY CHANGE: We will fetch skilled mechanics as before (base pool).
            // But for the "Selection" dropdown, we might want to sort them client-side if we have their locations,
            // OR we trigger a specific fetch when the admin interacts.
            // Given the current code pre-fetches everything:

            // Let's stick to the existing endpoint for the bulk view to ensure the page loads fast.
            // If we want "nearest", we really should do it per-request. 
            // BUT, if the user wants to see "nearest" in the dropdown, we can update the code to fetch 
            // specific nearest mechanics when the dropdown is clicked or for each request individually.

            // For now, let's use the standard skill endpoint to populate the map.
            // If we want to implement the "Nearest" feature strictly, we need to iterate through ALL requests
            // and fetch nearest mechanics for EACH request. This might be heavy if there are many requests.

            // Let's try to fetch nearest for the first request of this type as a sample, or just standard available.
            // Since the user asked to "Update AdminDashboard to fetch and display nearest mechanics based on service request location",
            // we should ideally do this per request row.

            const res = await apiClient.get(`/admin/mechanics/available/skill/${skill}`).catch(() => ({ data: [] }));
            skillMap[type] = Array.isArray(res.data) ? res.data : [];
          } catch (e) {
            console.warn(`Failed to fetch mechanics for skill: ${type}`, e);
            const skill = mapProblemTypeToSkill(type);
            skillMap[type] = availableMechanics.filter(m => m.skillType === skill);
          }
        }));
        setSkilledMechanics(skillMap);

      } catch (err) {
        setError('Failed to load admin data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated, user, navigate]);

  // Fetch nearest mechanics for a specific request when the user interacts with it
  const fetchNearestMechanics = async (request: RequestItem) => {
    if (!request.latitude || !request.longitude) return;

    try {
      const skill = mapProblemTypeToSkill(request.problemType);

      // Update to use the center-based nearest mechanic endpoint
      // This endpoint considers the center's location for mechanics assigned to centers
      const res = await apiClient.get(`/admin/mechanics/available/skill/${skill}/nearest/by-center`, {
        params: {
          latitude: request.latitude,
          longitude: request.longitude
        }
      });

      if (Array.isArray(res.data)) {
        // Sort mechanics by distance in ascending order (nearest first)
        // If distances are equal or null, sort by ID (ascending)
        const sortedMechanics = res.data.sort((a: Mechanic, b: Mechanic) => {
          // Handle null/undefined distances (put them last)
          if (a.distance == null && b.distance == null) return a.id - b.id; // Sort by ID if both distances null
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;

          // If distances are equal (or very close), sort by ID
          if (Math.abs(a.distance - b.distance) < 0.01) {
            return a.id - b.id;
          }

          return a.distance - b.distance;
        });

        setSkilledMechanics(prev => ({
          ...prev,
          [`${request.problemType}_${request.requestId}`]: sortedMechanics
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch nearest mechanics by center', e);
      // Fallback to standard nearest if by-center fails (e.g. backend not updated yet)
      try {
        const skill = mapProblemTypeToSkill(request.problemType);
        const resFallback = await apiClient.get(`/admin/mechanics/available/skill/${skill}/nearest`, {
          params: {
            latitude: request.latitude,
            longitude: request.longitude
          }
        });
        if (Array.isArray(resFallback.data)) {
          // Sort fallback results too
          const sortedFallback = resFallback.data.sort((a: Mechanic, b: Mechanic) => {
            if (a.distance == null && b.distance == null) return a.id - b.id;
            if (a.distance == null) return 1;
            if (b.distance == null) return -1;

            if (Math.abs(a.distance - b.distance) < 0.01) {
              return a.id - b.id;
            }

            return a.distance - b.distance;
          });

          setSkilledMechanics(prev => ({
            ...prev,
            [`${request.problemType}_${request.requestId}`]: sortedFallback
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch nearest mechanics (fallback)', err);
      }
    }
  };

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
        <div className="flex gap-3">
          <Link to="/admin/centers">
            <Button variant="outline">
              <Building2 className="mr-2 h-4 w-4" />
              Service Centers
            </Button>
          </Link>
          <Link to="/admin/mechanics">
            <Button>
              <Users className="mr-2 h-4 w-4" />
              Manage Mechanics
            </Button>
          </Link>
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
                          className="border rounded-md px-2 py-1 text-sm max-w-[200px]"
                          value={selection[r.requestId] || ''}
                          onClick={() => fetchNearestMechanics(r)} // Fetch nearest on click
                          onChange={(e) =>
                            setSelection((prev) => ({ ...prev, [r.requestId]: Number(e.target.value) }))
                          }
                        >
                          <option value="">Select mechanic</option>
                          {/* Prefer mechanics specific to this request (nearest), otherwise fall back to generic skill list */}
                          {(skilledMechanics[`${r.problemType}_${r.requestId}`] || skilledMechanics[r.problemType] || []).length > 0 ? (
                            (skilledMechanics[`${r.problemType}_${r.requestId}`] || skilledMechanics[r.problemType] || []).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                                {m.distance != null ? ` (${m.distance.toFixed(1)} km)` : ''}
                                {m.rating ? ` ★${m.rating}` : ' (New)'}
                              </option>
                            ))
                          ) : (
                            <option disabled>No skilled mechanics available</option>
                          )}
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
