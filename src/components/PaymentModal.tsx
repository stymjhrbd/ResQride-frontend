import React, { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    requestId: number;
    amount: number;
    problemType: string;
  } | null;
  onSuccess: (requestId: number) => void;
}

const PAYMENT_METHODS = [
  { id: 'CREDIT_CARD', name: 'Credit/Debit Card', icon: CreditCard },
  { id: 'UPI', name: 'UPI / GPay / PhonePe', icon: Smartphone },
  { id: 'CASH', name: 'Cash', icon: Banknote },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, request, onSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('CREDIT_CARD');
  const [step, setStep] = useState<'SELECT' | 'PROCESSING' | 'SUCCESS'>('SELECT');

  if (!isOpen || !request) return null;

  const handlePay = async () => {
    setStep('PROCESSING');

    // Simulate network delay for better UX
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // 1. Process the payment
      await apiClient.post('/payments', {
        requestId: request.requestId,
        amount: request.amount,
        paymentMethod: selectedMethod
      });

      // 2. Update service request status to PAID
      await apiClient.patch(`/requests/${request.requestId}/status`, null, {
        params: { status: 'PAID' }
      });

      setStep('SUCCESS');
      toast.success('Payment processed successfully!');

      // Close after a brief success message
      setTimeout(() => {
        onSuccess(request.requestId);
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
      setStep('SELECT');
    }
  };

  const handleClose = () => {
    setStep('SELECT');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all scale-100">

        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">
            {step === 'PROCESSING' ? 'Processing Payment' :
              step === 'SUCCESS' ? 'Payment Successful' : 'Secure Payment'}
          </h3>
          {step === 'SELECT' && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">

          {step === 'SELECT' && (
            <>
              <div className="mb-6 text-center">
                <p className="text-sm text-gray-500 mb-1">Total Amount Due</p>
                <div className="text-4xl font-extrabold text-gray-900">
                  ₹{request.amount.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-blue-600 font-medium mt-2 bg-blue-50 inline-block px-2 py-1 rounded">
                  Request #{request.requestId} • {request.problemType}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-700 font-medium">Select Payment Method</Label>
                <div className="grid gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`
                        flex items-center p-4 border rounded-lg cursor-pointer transition-all
                        ${selectedMethod === method.id
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                      `}
                    >
                      <div className={`
                        p-2 rounded-full mr-4
                        ${selectedMethod === method.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
                      `}>
                        <method.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${selectedMethod === method.id ? 'text-blue-900' : 'text-gray-900'}`}>
                          {method.name}
                        </p>
                      </div>
                      <div className={`
                        w-5 h-5 rounded-full border flex items-center justify-center
                        ${selectedMethod === method.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}
                      `}>
                        {selectedMethod === method.id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg shadow-lg shadow-green-600/20"
                onClick={handlePay}
              >
                Pay Now
              </Button>
            </>
          )}

          {step === 'PROCESSING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-white p-4 rounded-full border-4 border-blue-100">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                </div>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Contacting Bank...</h4>
              <p className="text-gray-500">Please do not close this window</p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
              <div className="bg-green-100 p-4 rounded-full mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-2">Payment Complete!</h4>
              <p className="text-gray-500">Transaction ID: TXN-{Date.now().toString().slice(-8)}</p>
            </div>
          )}
        </div>

        {/* Footer with security badge */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            256-bit SSL Encrypted Payment
          </p>
        </div>
      </div>
    </div>
  );
};
