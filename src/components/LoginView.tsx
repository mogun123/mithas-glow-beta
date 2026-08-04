import { useState } from 'react';
import { Mail, Lock, LogIn, Eye, EyeOff, Phone } from 'lucide-react';
import { useAuth } from '../lib/hooks/useAuth';
import { toast } from 'sonner@2.0.3';

interface LoginViewProps {
  onLogin: (data:any) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const { signIn, signInWithPhone, isLoading } = useAuth();
  
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (loginMethod === 'email') {
      if (!email) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Please enter a valid email';
      }

      if (!password) {
        newErrors.password = 'Password is required';
      }
    } else {
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      if (!phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (loginMethod === 'email') {
      // Email login with Supabase
      const result = await signIn(email, password);
      
      if (result.success) {
        toast.success('Welcome back to MITHAS Glow! ✨');
        onLogin(result.data);
      }
    } else {
      // Phone OTP login
      const result = await signInWithPhone(phone);
      
      if (result.success) {
        // OTP sent successfully, setCurrentView to OTP view will be handled by App.tsx
        // You might want to pass the phone number back to parent
        toast.success('OTP sent to your phone!');
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome Back!</h2>

      {/* Login Method Toggle */}
      <div className="flex bg-gray-100 rounded-full p-1 mb-6">
        <button
          type="button"
          onClick={() => setLoginMethod('email')}
          className={`flex-1 py-2 rounded-full transition-all ${
            loginMethod === 'email'
              ? 'bg-white shadow text-pink-600'
              : 'text-gray-500'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setLoginMethod('phone')}
          className={`flex-1 py-2 rounded-full transition-all ${
            loginMethod === 'phone'
              ? 'bg-white shadow text-pink-600'
              : 'text-gray-500'
          }`}
        >
          Phone OTP
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {loginMethod === 'email' ? (
          <>
            {/* Email Field */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3 pl-10 border ${errors.email ? 'border-red-500' : 'border-pink-200'} rounded-xl text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all`}
                placeholder="Email Address"
                disabled={isLoading}
              />
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 pl-10 pr-10 border ${errors.password ? 'border-red-500' : 'border-pink-200'} rounded-xl text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all`}
                placeholder="Password"
                disabled={isLoading}
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password */}
            <button
              type="button"
              className="text-sm text-pink-600 hover:underline text-right w-full block pt-1"
              onClick={() => toast.info('Password reset feature coming soon!')}
            >
              Forgot Password?
            </button>
          </>
        ) : (
          <>
            {/* Phone Number Field */}
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full p-3 pl-10 border ${errors.phone ? 'border-red-500' : 'border-pink-200'} rounded-xl text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all`}
                placeholder="Phone Number (+91 XXXXX XXXXX)"
                disabled={isLoading}
              />
              <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              We'll send a verification code to your phone number
            </p>
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl text-white bg-pink-500 hover:bg-pink-600 active:scale-99 transition-all flex items-center justify-center space-x-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{loginMethod === 'email' ? 'Signing In...' : 'Sending OTP...'}</span>
            </>
          ) : (
            <>
              <span>{loginMethod === 'email' ? 'Login' : 'Send OTP'}</span>
              <LogIn className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
