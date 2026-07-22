/**
 * Smart Tab Navigation Component
 * For You, Following, Nearby, Events tabs with AI-powered content
 */

import React from 'react';
import { SmartTabType } from '../types/feed.types';

interface SmartTabNavigationProps {
  activeTab: string;
  tabs: SmartTabType[];
  onTabChange: (tabId: string) => void;
}

export function SmartTabNavigation({ activeTab, tabs, onTabChange }: SmartTabNavigationProps) {
  return (
    <div className="sticky top-0 bg-white z-40 border-b border-gray-200">
      <div className="flex space-x-1 px-4 py-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {tab.icon && <span className="text-lg">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
