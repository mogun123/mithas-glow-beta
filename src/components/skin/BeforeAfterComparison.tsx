import React, { useState } from 'react';
import { Camera, ArrowLeftRight, Calendar, TrendingUp, TrendingDown, Eye, Droplet, Sun, Zap, Heart } from 'lucide-react';

interface BeforeAfterComparisonProps {
  currentReport: any;
  previousReports: any[];
  onClose?: () => void;
}

interface ComparisonMetric {
  name: string;
  icon: React.ReactNode;
  current: number;
  previous: number;
  unit: string;
  higherIsBetter: boolean;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  currentReport,
  previousReports,
  onClose
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');
  
  if (!currentReport || previousReports.length === 0) {
    return (
      <div className="text-center py-8">
        <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Need at least 2 scans for comparison</p>
      </div>
    );
  }

  const latestPrevious = previousReports[previousReports.length - 1];
  const daysSincePrevious = Math.floor(
    (new Date(currentReport.timestamp || Date.now()).getTime() - 
     new Date(latestPrevious.timestamp || Date.now()).getTime()) / 
    (1000 * 60 * 60 * 24)
  );

  const comparisonMetrics: ComparisonMetric[] = [
    {
      name: 'Skin Health',
      icon: <Heart className="w-4 h-4" />,
      current: currentReport.overallSkinHealthScore || 0,
      previous: latestPrevious.overallSkinHealthScore || 0,
      unit: '%',
      higherIsBetter: true
    },
    {
      name: 'Hydration',
      icon: <Droplet className="w-4 h-4" />,
      current: currentReport.hydration?.level || 0,
      previous: latestPrevious.hydration?.level || 0,
      unit: '%',
      higherIsBetter: true
    },
    {
      name: 'Oiliness',
      icon: <Sun className="w-4 h-4" />,
      current: currentReport.oiliness?.level || 0,
      previous: latestPrevious.oiliness?.level || 0,
      unit: '%',
      higherIsBetter: false
    },
    {
      name: 'Texture',
      icon: <Zap className="w-4 h-4" />,
      current: currentReport.texture?.score || 0,
      previous: latestPrevious.texture?.score || 0,
      unit: '%',
      higherIsBetter: true
    }
  ];

  const getChangeIndicator = (current: number, previous: number, higherIsBetter: boolean) => {
    const change = current - previous;
    const isImprovement = higherIsBetter ? change > 0 : change < 0;
    
    return {
      value: Math.abs(change),
      isImprovement,
      icon: isImprovement ? 
        <TrendingUp className="w-4 h-4 text-green-500" /> : 
        <TrendingDown className="w-4 h-4 text-red-500" />,
      color: isImprovement ? 'text-green-500' : 'text-red-500'
    };
  };

  const getOverallImprovement = () => {
    const improvements = comparisonMetrics.filter(metric => {
      const change = metric.current - metric.previous;
      return metric.higherIsBetter ? change > 0 : change < 0;
    });
    
    return {
      count: improvements.length,
      total: comparisonMetrics.length,
      percentage: Math.round((improvements.length / comparisonMetrics.length) * 100)
    };
  };

  const overallImprovement = getOverallImprovement();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Before/After Comparison
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {daysSincePrevious} days since last scan
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              selectedView === 'overview' 
                ? 'bg-purple-100 text-purple-600' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('detailed')}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              selectedView === 'detailed' 
                ? 'bg-purple-100 text-purple-600' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* Overall Improvement Summary */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">
            {overallImprovement.percentage}% Improved
          </div>
          <div className="text-sm opacity-90">
            {overallImprovement.count} of {overallImprovement.total} metrics showing progress
          </div>
        </div>
      </div>

      {/* Comparison Metrics */}
      {selectedView === 'overview' ? (
        <div className="grid grid-cols-2 gap-4">
          {comparisonMetrics.map((metric, index) => {
            const change = getChangeIndicator(metric.current, metric.previous, metric.higherIsBetter);
            
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {metric.icon}
                    <span className="font-medium text-sm">{metric.name}</span>
                  </div>
                  {change.icon}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current:</span>
                    <span className="font-medium">{metric.current}{metric.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Previous:</span>
                    <span className="font-medium">{metric.previous}{metric.unit}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-medium ${change.color}`}>
                    <span>Change:</span>
                    <span>
                      {change.isImprovement ? '+' : '-'}{change.value}{metric.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {comparisonMetrics.map((metric, index) => {
            const change = getChangeIndicator(metric.current, metric.previous, metric.higherIsBetter);
            const progressPercentage = metric.higherIsBetter 
              ? (metric.current / 100) * 100 
              : 100 - (metric.current / 100) * 100;
            
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {metric.icon}
                    <span className="font-medium">{metric.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {change.icon}
                    <span className={`text-sm font-medium ${change.color}`}>
                      {change.isImprovement ? '+' : '-'}{change.value}{metric.unit}
                    </span>
                  </div>
                </div>
                
                {/* Progress bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Current: {metric.current}{metric.unit}</span>
                      <span>{progressPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Previous: {metric.previous}{metric.unit}</span>
                      <span>
                        {metric.higherIsBetter 
                          ? ((metric.previous / 100) * 100).toFixed(0)
                          : (100 - (metric.previous / 100) * 100).toFixed(0)
                        }%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${metric.higherIsBetter 
                            ? (metric.previous / 100) * 100 
                            : 100 - (metric.previous / 100) * 100
                          }%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visual Comparison Placeholder */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Visual Comparison
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center mb-2">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
            <div className="text-sm font-medium">Before</div>
            <div className="text-xs text-gray-500">
              {new Date(latestPrevious.timestamp || Date.now()).toLocaleDateString()}
            </div>
          </div>
          <div className="text-center">
            <div className="bg-gray-200 rounded-lg h-32 flex items-center justify-center mb-2">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
            <div className="text-sm font-medium">After</div>
            <div className="text-xs text-gray-500">
              {new Date(currentReport.timestamp || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 p-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors">
          Share Progress
        </button>
        <button className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
          Export Report
        </button>
      </div>
    </div>
  );
};
