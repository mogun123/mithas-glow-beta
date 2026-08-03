import { useState, useRef, useEffect } from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/hooks/useAuth';
import { toast } from 'sonner@2.0.3';

interface OTPViewProps {
  identifier: string;
  identifierType: 'email' | 'phone';
  onVerify: () => void;
  onResend: () => void;
}

export function OTPView({ identifier, identifierType, onVerify, onResend }: OTPViewProps) {
  const { verifyOTP, signInWithPhone, isLoading } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
    
    // Start timer
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pastedData.every((char) => /^\d$/.test(char))) {
      const newOtp = [...otp];
      pastedData.forEach((char, index) => {
        if (index < 6) newOtp[index] = char;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (identifierType === 'phone') {
      // Verify phone OTP with Supabase
      const result = await verifyOTP(identifier, otpCode);
      
      if (result.success) {
        toast.success('Phone verified successfully! ✨');
        onVerify();
      }
    } else {
      // Email OTP verification (if you implement it)
      // For now, just call the success handler
      toast.success('Verification successful!');
      onVerify();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    if (identifierType === 'phone') {
      // Resend OTP via Supabase
      const result = await signInWithPhone(identifier);
      
      if (result.success) {
        // Reset timer
        setTimer(60);
        setCanResend(false);
        
        const interval = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } else {
      // Email resend
      setTimer(60);
      setCanResend(false);
      onResend();
      
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
      <p className="text-sm text-gray-500 mb-6">
        A 6-digit OTP has been sent to your{' '}
        <span className="capitalize">{identifierType}</span>:{' '}
        <span className="text-pink-600 font-medium">{identifier}</span>
      </p>

      <div className="flex justify-between space-x-2 mb-6" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-1/6 h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            pattern="[0-9]"
            inputMode="numeric"
            disabled={isLoading}
          />
        ))}
      </div>

      <div className="text-center mb-6">
        {!canResend && (
          <p className="text-sm text-gray-500 mb-2">
            Resend code in <span className="text-pink-600 font-semibold">{timer}</span>s
          </p>
        )}
        <button
          onClick={handleResend}
          disabled={!canResend || isLoading}
          className={`text-sm text-pink-600 hover:underline transition-all ${
            !canResend || isLoading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {isLoading ? 'Sending...' : 'Resend OTP'}
        </button>
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={isLoading || otp.join('').length !== 6}
        className="w-full py-3 rounded-xl text-white bg-pink-500 hover:bg-pink-600 active:scale-99 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Verifying...</span>
          </>
        ) : (
          <>
            <span>Verify & Continue</span>
            <CheckCircle className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Back button hint */}
      <p className="text-center text-sm text-gray-500 mt-4">
        Wrong {identifierType}?{' '}
        <button
          type="button"
          className="text-pink-600 hover:underline"
          onClick={() => window.history.back()}
        >
          Go back
        </button>
      </p>
    </div>
  );
}
