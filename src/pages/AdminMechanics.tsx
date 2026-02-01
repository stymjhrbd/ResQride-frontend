import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Loader2, Eye, CheckCircle, XCircle, ArrowLeft, X, Building2 } from 'lucide-react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

interface Mechanic {
  id: number;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  availability: string;
  skillType?: string;
  center?: {
    id: number;
    name: string;
    city: string;
  } | null;
  assignedCenter?: {
    id: number;
    name: string;
    city: string;
  } | null;
}

interface Center {
  id: number;
  name: string;
  city: string;
}

interface Feedback {
  id: number;
  requestId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export const AdminMechanics: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feedback Modal State
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [feedbackItems, setFeedbackItems] = useState<Feedback[]>([]);

  // Center Assignment State
  const [centers, setCenters] = useState<Center[]>([]);
  const [assignCenterOpen, setAssignCenterOpen] = useState(false);
  const [assigningCenter, setAssigningCenter] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    fetchMechanics();
    fetchCenters();
  }, [isAuthenticated, user, navigate]);

  const fetchCenters = async () => {
    try {
      const res = await apiClient.get('/centers');
      setCenters(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // Fallback
      try {
        const res2 = await apiClient.get('/admin/centers');
        setCenters(Array.isArray(res2.data) ? res2.data : []);
      } catch (e) {
        console.warn('Failed to fetch centers:', e);
      }
    }
  };

  const fetchMechanics = async () => {
    setIsLoading(true);
    try {
      // Fetch all mechanics
      // Using /admin/mechanics endpoint as requested/assumed
      // If backend uses a different path, this needs adjustment. 
      // Based on previous turn, I added a fallback in Dashboard, but here we expect it to exist or we use what we can.
      // If /admin/mechanics/all is the endpoint user specified:
      const response = await apiClient.get('/admin/mechanics/all');

      // Ensure we map the response correctly if center is nested or structured differently
      const mechanicsData = Array.isArray(response.data) ? response.data : [];
      setMechanics(mechanicsData);

    } catch (err) {
      console.error('Failed to fetch mechanics:', err);
      setError('Failed to load mechanics data. Ensure backend endpoint /api/admin/mechanics/all exists.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMechanic = async (id: number) => {
    try {
      await apiClient.patch(`/admin/mechanics/${id}/verify`);
      // Update local state
      setMechanics(prev => prev.map(m => m.id === id ? { ...m, verified: true } : m));
    } catch (err) {
      console.error('Failed to verify mechanic:', err);
      alert('Failed to verify mechanic');
    }
  };

  const openFeedback = async (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setFeedbackOpen(true);
    setFeedbackLoading(true);
    try {
      const res = await apiClient.get(`/admin/feedback/mechanic/${mechanic.id}`);
      setFeedbackItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load feedback:', err);
      setFeedbackItems([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const openAssignCenter = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    // Use center OR assignedCenter
    const center = mechanic.center || mechanic.assignedCenter;
    setSelectedCenterId(center?.id || null);
    setAssignCenterOpen(true);
  };

  const handleAssignCenter = async () => {
    if (!selectedMechanic || !selectedCenterId) return;
    setAssigningCenter(true);
    try {
      await apiClient.patch('/mechanics/assign-center', null, {
        params: {
          email: selectedMechanic.email,
          centerId: selectedCenterId
        }
      });
      // Refresh list
      await fetchMechanics();
      setAssignCenterOpen(false);
      // alert('Center assigned successfully'); // Optional
    } catch (err: any) {
      console.error('Failed to assign center:', err);
      // Show detailed error if available (e.g., "Slot full")
      alert(err.response?.data?.message || 'Failed to assign center');
    } finally {
      setAssigningCenter(false);
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
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mr-4">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Manage Mechanics</h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mechanic Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Availability</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mechanics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No mechanics found.</td>
                </tr>
              ) : (
                mechanics.map((mechanic) => (
                  <tr key={mechanic.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{mechanic.name}</div>
                      <div className="text-xs text-gray-500">ID: {mechanic.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mechanic.email}</div>
                      <div className="text-sm text-gray-500">{mechanic.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mechanic.skillType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        const center = mechanic.center || mechanic.assignedCenter;
                        return center ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{center.name}</span>
                            <span className="text-xs">{center.city}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No Center</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mechanic.verified ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1 self-center" /> Verified
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          <XCircle className="h-3 w-3 mr-1 self-center" /> Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${mechanic.availability === 'AVAILABLE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {mechanic.availability || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {!mechanic.verified && (
                        <Button size="sm" onClick={() => verifyMechanic(mechanic.id)} className="bg-green-600 hover:bg-green-700">
                          Verify
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openAssignCenter(mechanic)}>
                        <Building2 className="h-4 w-4 mr-1" /> Center
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openFeedback(mechanic)}>
                        <Eye className="h-4 w-4 mr-1" /> Feedback
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Feedback for {selectedMechanic?.name}</h3>
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={() => setFeedbackOpen(false)}
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {feedbackLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : feedbackItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No feedback found for this mechanic.
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackItems.map((item, idx) => (
                    <div key={item.id || idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <span className="text-yellow-500 font-bold text-lg mr-1">★</span>
                          <span className="font-semibold">{item.rating}/5</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Date N/A'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{item.comment}</p>
                      <div className="mt-2 text-xs text-gray-400">Request ID: {item.requestId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Center Modal */}
      {assignCenterOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Assign Center</h3>
              <button
                className="p-2 rounded hover:bg-gray-100"
                onClick={() => setAssignCenterOpen(false)}
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-sm text-gray-600">
                Assign <strong>{selectedMechanic?.name}</strong> ({selectedMechanic?.skillType}) to a service center.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Center</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={selectedCenterId || ''}
                  onChange={(e) => setSelectedCenterId(Number(e.target.value))}
                >
                  <option value="">-- No Center --</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name} ({center.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setAssignCenterOpen(false)}>Cancel</Button>
                <Button onClick={handleAssignCenter} disabled={assigningCenter}>
                  {assigningCenter ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : 'Save Assignment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
