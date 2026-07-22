import { useState } from 'react';
import { Mail, Phone, Lock, ShieldCheck, MailCheck, CircleDot, Apple, User, Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { useAuth } from '../lib/hooks/useAuth';
import { toast } from 'sonner@2.0.3';

interface RegisterViewProps {
  onSendOTP: (identifier: string, type: 'email' | 'phone') => void;
}

export function RegisterView({ onSendOTP }: RegisterViewProps) {
  const { signUp, isLoading } = useAuth();
  
  const [inputType, setInputType] = useState<'email' | 'phone'>('email');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '' as 'female' | 'male' | '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.displayName.trim()) {
      newErrors.displayname = 'Full name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayname = 'Name must be at least 2 characters';
    }

    // Email/Phone validation based on input type
    if (inputType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }
    } else {
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    // Terms acceptance
    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (inputType === 'email') {
      // Email registration with Supabase
      const result = await signUp(formData.email, formData.password, {
        full_name: formData.displayName,
        gender: formData.gender as 'female' | 'male',
        display_name: formData.displayName,
      });

      if (result.success) {
        toast.success('Account created! Please check your email to verify.');
        // Note: You might want to navigate to profile setup or home
        // The useAuth hook handles the session, so user will be logged in automatically
      }
    } else {
      // Phone registration - send OTP
      onSendOTP(formData.phone, 'phone');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Account</h2>

      {/* Email / Phone Toggle */}
      <div className="flex bg-gray-100 rounded-full p-1 mb-6">
        <button
          type="button"
          onClick={() => setInputType('email')}
          className={`flex-1 py-2 rounded-full transition-all ${
            inputType === 'email'
              ? 'bg-white shadow text-pink-600'
              : 'text-gray-500'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setInputType('phone')}
          className={`flex-1 py-2 rounded-full transition-all ${
            inputType === 'phone'
              ? 'bg-white shadow text-pink-600'
              : 'text-gray-500'
          }`}
        >
          Phone Number
        </button>
      </div>

      {/* Input Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Field */}
        <div className="relative">
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className={`w-full p-3 pl-10 border ${errors.displayname ? 'border-red-500' : 'border-pink-200'} rounded-xl text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all`}
            placeholder="Display Name"
            disabled={isLoading}
          />
          <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          {errors.displayname && (
            <p className="text-red-500 text-sm mt-1">{errors.displayname}</p>
          )}
        </div>

        {/* Email or Phone Field */}
        <div className="relative">
          <input
            type={inputType === 'email' ? 'email' : 'tel'}
            value={inputType === 'email' ? formData.email : formData.phone}
            onChange={(e) => setFormData({ 
              ...formData, 
              [inputType === 'email' ? 'email' : 'phone']: e.target.value 
            })}
            className={`w-full p-3 pl-10 border ${errors[inputType] ? 'border-red-500' : 'border-pink-200'} rounded-xl text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all`}
            placeholder={inputType === 'email' ? 'Enter your Email' : 'Enter your Phone Number'}
            disabled={isLoading}
          />
          {inputType === 'email' ? (
            <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          ) : (
            <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          )}
          {errors[inputType] && (
            <p className="text-red-500 text-sm mt-1">{errors[inputType]}</p>
          )}
        </div>

        {/* Gender Selection - Only for email registration */}
        {inputType === 'email' && (
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              I'm shopping for
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'female' })}
                className={`p-3 border-2 rounded-lg transition ${
                  formData.gender === 'female'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <span className="text-2xl mb-1 block">👗</span>
                <span className="text-sm">Women</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'male' })}
                className={`p-3 border-2 rounded-lg transition ${
                  formData.gender === 'male'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <span className="text-2xl mb-1 block">👔</span>
                <span className="text-sm">Men</span>
              </button>
            </div>
            {errors.gender && (
              <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
            )}
          </div>
        )}

        {/* Password Field - Only for email registration */}
        {inputType === 'email' && (
          <>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full p-3 pl-10 pr-10 border ${errors.password ? 'border-red-500' : 'border-pink-200'} rounded-xl text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all`}
                placeholder="Create Password"
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

            {/* Confirm Password Field */}
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full p-3 pl-10 pr-10 border ${errors.confirmPassword ? 'border-red-500' : 'border-pink-200'} rounded-xl text-gray-700 placeholder-gray-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 outline-none transition-all`}
                placeholder="Confirm Password"
                disabled={isLoading}
              />
              <ShieldCheck className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {formData.password && <PasswordStrengthIndicator password={formData.password} />}
          </>
        )}

        {/* Terms and Privacy Checkbox */}
        <div className="flex items-start pt-2">
          <input
            id="terms-checkbox"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 mt-0.5"
            disabled={isLoading}
          />
          <label htmlFor="terms-checkbox" className="ml-2 text-sm text-gray-500">
            I agree to the{' '}
            <span className="text-pink-600 hover:underline cursor-pointer">
              Terms & Privacy Policy
            </span>
          </label>
        </div>
        {errors.terms && (
          <p className="text-red-500 text-sm">{errors.terms}</p>
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
              <span>{inputType === 'email' ? 'Creating Account...' : 'Sending OTP...'}</span>
            </>
          ) : (
            <>
              <span>{inputType === 'email' ? 'Create Account' : 'Send OTP & Continue'}</span>
              <MailCheck className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Social Login Separator */}
        <div className="relative flex items-center justify-center py-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <span className="relative bg-white px-3 text-sm text-gray-500">OR</span>
        </div>

        {/* Social Login Buttons */}
        <button
          type="button"
          className="w-full py-3 border border-gray-300 rounded-xl text-gray-700 flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          <CircleDot className="w-5 h-5 text-gray-700" />
          <span>Continue with Google</span>
        </button>
        <button
          type="button"
          className="w-full py-3 border border-gray-300 rounded-xl text-gray-700 flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          <Apple className="w-5 h-5 text-gray-700" />
          <span>Continue with Apple</span>
        </button>
      </form>
    </div>
  );
}
