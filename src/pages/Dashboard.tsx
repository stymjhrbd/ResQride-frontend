import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock, MapPin, AlertCircle, CheckCircle, Loader2, Star, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import apiClient from '../api/client';
import { toast } from 'react-toastify';
import { PaymentModal } from '../components/PaymentModal';

import { useAuthStore } from '../store/authStore';

interface ServiceRequest {
  requestId: number;
  problemType: string;
  status: string;
  date?: string;
  createdAt?: string;
  location: string;
  mechanic?: { id: number; name: string } | null;
  mechanicId?: number;
  mechanicName?: string;
  amount: number;
  paid?: boolean;
}

export const Dashboard: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [mechanicsMap, setMechanicsMap] = useState<Record<number, string>>({});
  const [ratingsMap, setRatingsMap] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackRequest, setFeedbackRequest] = useState<ServiceRequest | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<ServiceRequest | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [paymentStatuses, setPaymentStatuses] = useState<Record<number, any>>({});
  // Force a re-render when payment statuses are updated
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchRequests = async () => {
      try {
        const response = await apiClient.get('/requests/me');
        const data = response.data;
        // Sort requests by ID (descending)
        data.sort((a: ServiceRequest, b: ServiceRequest) => b.requestId - a.requestId);
        setRequests(data);

        // Fetch payment status for each request
        const statusMap: Record<number, any> = {};
        await Promise.all(data.map(async (req: ServiceRequest) => {
          try {
            const statusRes = await apiClient.get(`/requests/${req.requestId}/payment-status`);
            statusMap[req.requestId] = statusRes.data;
          } catch (e) {
            console.warn(`Could not fetch payment status for ${req.requestId}`, e);
          }
        }));
        setPaymentStatuses(statusMap);
        forceUpdate({}); // Force re-render to reflect new payment statuses

        // Fetch mechanic names for assigned requests if mechanicId is present but name is missing
        const mechanicIds = data
          .filter((r: ServiceRequest) => r.mechanicId && !r.mechanicName && !r.mechanic?.name)
          .map((r: ServiceRequest) => r.mechanicId);

        if (mechanicIds.length > 0) {
          try {
            // We need an endpoint to get mechanic details by ID. 
            // Assuming /mechanics/{id} or /admin/mechanics exists and is accessible.
            // Since user might not have access to /admin/mechanics, we might need a public/user accessible endpoint.
            // For now, let's try to fetch them individually or use a bulk endpoint if available.
            // If no such endpoint exists for users, we can't display the name without backend changes.
            // However, often there's a public profile endpoint.

            // Temporary workaround: Fetch from a hypothetical endpoint or skip if not available.
            // Realistically, without backend change, we can't get the name if the DTO doesn't have it 
            // and there's no public endpoint.
            // But let's assume we can fetch it.

            const uniqueIds = [...new Set(mechanicIds)] as number[];
            const names: Record<number, string> = {};

            await Promise.all(uniqueIds.map(async (id) => {
              try {
                // Try to fetch mechanic public profile
                // We are using the public endpoint created for this purpose
                const mechRes = await apiClient.get(`/mechanics/public/${id}`);
                names[id] = mechRes.data.name;
              } catch (e) {
                console.warn(`Could not fetch mechanic ${id}`, e);
              }
            }));

            setMechanicsMap(names);
          } catch (mechErr) {
            console.error('Failed to fetch mechanic details', mechErr);
          }
        }

        // Fetch ratings for completed/paid requests
        const completedRequests = data.filter((r: ServiceRequest) => r.status === 'COMPLETED' || r.status === 'PAID');
        if (completedRequests.length > 0) {
          const ratings: Record<number, number> = {};
          await Promise.all(completedRequests.map(async (req: ServiceRequest) => {
            try {
              // Fetch feedback for this request
              const feedbackRes = await apiClient.get(`/feedback/request/${req.requestId}`);
              // If feedback exists (array not empty), get the rating
              if (Array.isArray(feedbackRes.data) && feedbackRes.data.length > 0) {
                // Assuming the first one is the relevant one (or take average if multiple allowed)
                ratings[req.requestId] = feedbackRes.data[0].rating;
              }
            } catch (e) {
              // Ignore 404 or empty
            }
          }));
          setRatingsMap(ratings);
        }

      } catch (err) {
        console.error('Failed to fetch requests:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [isAuthenticated]);

  const openFeedback = (request: ServiceRequest) => {
    setFeedbackRequest(request);
    setRating(5);
    setComment('');
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRequest) return;

    setSubmittingFeedback(true);
    try {
      await apiClient.post('/feedback', {
        requestId: feedbackRequest.requestId,
        mechanicId: feedbackRequest.mechanicId || 0,
        rating,
        comment
      });
      toast.success('Thank you for your feedback!');

      // Update local state to show "Rated" immediately
      if (feedbackRequest) {
        setRatingsMap(prev => ({ ...prev, [feedbackRequest.requestId]: rating }));
      }

      setFeedbackRequest(null);
    } catch (error) {
      console.error('Feedback submission failed:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handlePayment = (request: ServiceRequest) => {
    setPaymentRequest(request);
    setIsPaymentModalOpen(true);
  };

  const onPaymentSuccess = (requestId: number) => {
    setRequests(prev => prev.map(r =>
      r.requestId === requestId
        ? { ...r, status: 'PAID', paid: true } // Update status to PAID to match backend
        : r
    ));

    // Find the request to generate receipt
    const request = requests.find(r => r.requestId === requestId);
    if (request) {
      generateReceipt(request);
    }
  };

  const generateReceipt = (request: ServiceRequest) => {
    const transactionId = `T${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;
    const date = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const receiptContent = `
    ================================================
                  RESQRIDE SERVICE RECEIPT
    ================================================
    
    Receipt No     : ${transactionId}
    Date           : ${date}
    
    ------------------------------------------------
    CUSTOMER DETAILS
    ------------------------------------------------
    Request ID     : #${request.requestId}
    Location       : ${request.location}
    
    ------------------------------------------------
    SERVICE DETAILS
    ------------------------------------------------
    Service Type   : ${getProblemTypeLabel(request.problemType)}
    Mechanic       : ${request.mechanicName || 'Assigned Mechanic'}
    Mechanic ID    : ${request.mechanicId || 'N/A'}
    
    ------------------------------------------------
    PAYMENT SUMMARY
    ------------------------------------------------
    Total Amount   : ₹${request.amount.toLocaleString('en-IN')}
    Payment Status : PAID
    Transaction ID : ${transactionId}
    
    ================================================
    Thank you for choosing ResQride!
    For support: support@resqride.com
    ================================================
    `;

    // Create a blob and download it
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ResQride_Receipt_${transactionId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.info('Receipt downloaded successfully');
  };

  const getStatusLabel = (status: string) => {
    if (!status) return 'Unknown';
    switch (status) {
      case 'ASSIGNED':
        return 'Mechanic Assigned';
      case 'COMPLETED':
        return 'Service Completed';
      case 'IN_PROGRESS':
        return 'Work in Progress';
      case 'CREATED':
        return 'Request Received';
      case 'PAYMENT_PENDING':
        return 'Payment Pending';
      case 'PAID':
        return 'Payment Received';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status.replace('_', ' ');
    }
  };

  const getProblemTypeLabel = (type: string) => {
    switch (type) {
      case 'TOWING': return 'Towing Service';
      case 'TIRE_CHANGE': return 'Flat Tire Change';
      case 'BATTERY': return 'Battery Jump Start';
      case 'FUEL': return 'Fuel Delivery';
      case 'LOCKOUT': return 'Lockout Service';
      case 'MECHANIC': return 'General Mechanic';
      default: return type.replace('_', ' ');
    }
  };

  // Calculate stats
  const activeRequests = requests.filter(r =>
    r.status === 'CREATED' ||
    r.status === 'PAYMENT_PENDING' ||
    r.status === 'PAID' ||
    r.status === 'ASSIGNED' ||
    r.status === 'IN_PROGRESS'
  ).length;
  const completedServices = requests.filter(r => r.status === 'COMPLETED').length;
  // Placeholder for reviews as it's not in the request object usually
  const pendingReviews = 0;

  const getServiceType = (request: ServiceRequest) => {
    // Use problemType instead of serviceType
    return getProblemTypeLabel(request.problemType);
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
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <Link to="/service-request">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stats Cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-full">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{activeRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed Services</p>
              <p className="text-2xl font-semibold text-gray-900">{completedServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-50 rounded-full">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
              <p className="text-2xl font-semibold text-gray-900">{pendingReviews}</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mt-12 mb-6">Recent Requests</h2>
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mechanic
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.requestId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{getServiceType(request)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : request.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : request.status === 'IN_PROGRESS' || request.status === 'ASSIGNED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.date || request.createdAt?.split('T')[0] || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {request.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.mechanicName || request.mechanic?.name || mechanicsMap[request.mechanicId || 0] || 'Not Assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(() => {
                        const pStatus = paymentStatuses[request.requestId];
                        // Check all indicators of payment:
                        // 1. Payment status API says isPaid
                        // 2. Status is COMPLETED or PAID
                        // 3. The 'paid' boolean flag is true
                        const isPaid = pStatus?.isPaid ||
                          request.status === 'COMPLETED' ||
                          request.status === 'PAID' ||
                          request.paid;

                        // Only allow payment if NOT paid and status indicates pending payment
                        // AND we have confirmed the status is indeed pending payment from the dedicated endpoint
                        const canPay = !isPaid && (
                          (pStatus && pStatus.canPay) ||
                          (!pStatus && request.status === 'PAYMENT_PENDING')
                        );

                        if (isPaid) {
                          return ratingsMap[request.requestId] ? (
                            <div className="flex items-center text-yellow-500 font-medium">
                              <Star className="mr-1 h-4 w-4 fill-current" />
                              {ratingsMap[request.requestId]} / 5
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => openFeedback(request)}>
                              <Star className="mr-2 h-4 w-4 text-yellow-500" />
                              Rate
                            </Button>
                          );
                        } else if (canPay) {
                          return (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handlePayment(request)}
                            >
                              Pay ₹{request.amount}
                            </Button>
                          );
                        } else if (request.status === 'ASSIGNED' || request.status === 'IN_PROGRESS') {
                          return <span className="text-blue-500 font-medium">In Progress</span>;
                        } else {
                          return <span className="text-gray-400 italic">Pending Assignment</span>;
                        }
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {feedbackRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Rate Service</h3>
              <button onClick={() => setFeedbackRequest(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={submitFeedback}>
              <div className="mb-4">
                <Label className="block text-sm font-medium text-gray-700 mb-1">Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <Label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Comment (Optional)
                </Label>
                <textarea
                  id="comment"
                  rows={4}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Share your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setFeedbackRequest(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingFeedback}>
                  {submittingFeedback ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        request={paymentRequest}
        onSuccess={onPaymentSuccess}
      />
    </div>
  );
};
