import { useEffect, useState } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState({ score: 0, text: '', color: '', width: '0%' });

  useEffect(() => {
    if (password.length === 0) {
      setStrength({ score: 0, text: '', color: '', width: '0%' });
      return;
    }

    let score = 0;
    if (password.length > 5) score++;
    if (password.length > 7) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let text = '';
    let width = '0%';
    let color = '';

    switch (score) {
      case 0:
        text = 'Too Short';
        width = '10%';
        color = 'bg-red-500';
        break;
      case 1:
        text = 'Weak';
        width = '25%';
        color = 'bg-red-500';
        break;
      case 2:
        text = 'Fair';
        width = '50%';
        color = 'bg-yellow-500';
        break;
      case 3:
        text = 'Good';
        width = '75%';
        color = 'bg-blue-500';
        break;
      case 4:
      case 5:
        text = 'Strong';
        width = '100%';
        color = 'bg-green-500';
        break;
    }

    setStrength({ score, text, color, width });
  }, [password]);

  const getTextColor = () => {
    if (!password) return 'text-gray-500';
    if (strength.color.includes('red')) return 'text-red-500';
    if (strength.color.includes('yellow')) return 'text-yellow-500';
    if (strength.color.includes('blue')) return 'text-blue-500';
    if (strength.color.includes('green')) return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <div className="mt-1">
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: strength.width }}
        />
      </div>
      <p className={`text-xs mt-1 ${getTextColor()}`}>{strength.text}</p>
    </div>
  );
}
