import { useState } from 'react';
import { Bot, Sparkles, MessageSquare, Send, Lightbulb, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

interface ProfessionalAIAssistantProps {
  artistId: string;
  onBack?: () => void;
}

const QUICK_ACTIONS = [
  { icon: Lightbulb, label: 'Pricing Tips', query: 'Give me pricing suggestions for bridal makeup' },
  { icon: TrendingUp, label: 'Growth Tips', query: 'How can I grow my makeup business?' },
  { icon: Users, label: 'Customer Retention', query: 'Tips for customer retention' },
  { icon: DollarSign, label: 'Revenue Boost', query: 'Ways to increase my revenue' },
];

const SUGGESTED_QUESTIONS = [
  'How do I prepare a bride for makeup?',
  'What foundation shade should I recommend for olive skin?',
  'Give me a bridal preparation checklist',
  'How can I improve my portfolio?',
  'What are the latest makeup trends for 2024?',
  'How do I handle difficult clients?',
];

// TODO: Replace with actual AI service URL from env config
const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

export default function ProfessionalAIAssistant({ artistId, onBack }: ProfessionalAIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your professional AI assistant. I can help you with pricing suggestions, makeup trends, customer retention tips, and business growth strategies. What would you like to know today?",
      suggestions: ['Pricing suggestions', 'Makeup trends', 'Business growth tips'],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const generateResponse = async (query: string): Promise<string> => {
    const response = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        user_id: artistId,
        context: 'professional_makeup_artist',
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `AI service returned ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || data.reply || 'I received your message.';
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await generateResponse(content);
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        suggestions: ['Ask another question', 'Get more details'],
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get AI response';
      console.error('AI response error:', error);
      toast.error(message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (query: string) => {
    handleSendMessage(query);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-pink-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#D4AF37] to-orange-500 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">AI Assistant</h1>
              <p className="text-xs text-gray-500">Your business & makeup expert</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-4 border-b bg-white">
        <p className="text-xs font-medium text-gray-500 mb-3">QUICK ACTIONS</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {QUICK_ACTIONS.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => handleQuickAction(action.query)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D4AF37]/10 to-orange-500/10 rounded-full text-sm font-medium whitespace-nowrap hover:from-[#D4AF37]/20 hover:to-orange-500/20 transition-colors"
              >
                <Icon className="w-4 h-4 text-[#D4AF37]" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#D4AF37] text-white'
                  : 'bg-white border border-gray-100 shadow-sm'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-semibold text-[#D4AF37]">AI Assistant</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              
              {message.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {message.suggestions.map((suggestion, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-[#D4AF37] hover:text-white hover:border-[#D4AF37] transition-colors text-xs"
                      onClick={() => handleSendMessage(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      {messages.length < 3 && (
        <div className="px-4 py-3 bg-white border-t">
          <p className="text-xs font-medium text-gray-500 mb-2">SUGGESTED QUESTIONS</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(question)}
                className="text-xs px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-left max-w-full truncate"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 p-4 bg-white border-t safe-area-bottom">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="flex gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about pricing, trends, or business tips..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isTyping}
            className="bg-[#D4AF37] hover:bg-[#B8962E] text-white px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
