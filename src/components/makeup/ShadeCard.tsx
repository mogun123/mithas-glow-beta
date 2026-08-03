import React, { useState } from 'react';
import { Palette, Eye, Sparkles, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { MakeupComponent } from '../../lib/ai/autonomous-makeup-artist';

interface ShadeCardProps {
  component: MakeupComponent;
  isSelected?: boolean;
  onSelect?: (component: MakeupComponent) => void;
  onPreview?: (component: MakeupComponent) => void;
  showIntensity?: boolean;
  currentIntensity?: number;
  onIntensityChange?: (intensity: number) => void;
  gender: 'male' | 'female' | 'unisex';
  disabled?: boolean;
}

export function ShadeCard({
  component,
  isSelected = false,
  onSelect,
  onPreview,
  showIntensity = false,
  currentIntensity = component.customization.intensity,
  onIntensityChange,
  gender,
  disabled = false
}: ShadeCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const getComponentIcon = () => {
    switch (component.type) {
      case 'lipstick':
      case 'lip_liner':
        return <Palette className="h-4 w-4" />;
      case 'eyeshadow':
      case 'eyeliner':
      case 'mascara':
        return <Eye className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getGenderBadge = () => {
    if (component.type === 'beard_oil' || component.type === 'skin_evening') {
      return <Badge variant="outline" className="text-blue-600">Men</Badge>;
    }
    if (['foundation', 'eyeshadow', 'lipstick', 'blush'].includes(component.type)) {
      return <Badge variant="outline" className="text-pink-600">Women</Badge>;
    }
    return <Badge variant="outline" className="text-gray-600">Unisex</Badge>;
  };

  const handleSelect = () => {
    if (!disabled && onSelect) {
      onSelect(component);
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(component);
      setPreviewMode(true);
      setTimeout(() => setPreviewMode(false), 2000); // 2 second preview
    }
  };

  const handleIntensityChange = (value: number) => {
    if (onIntensityChange) {
      onIntensityChange(value);
    }
  };

  return (
    <Card 
      className={`
        relative transition-all duration-300 cursor-pointer
        ${isSelected ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${previewMode ? 'ring-2 ring-green-500 animate-pulse' : ''}
      `}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getComponentIcon()}
            <CardTitle className="text-sm font-medium">
              {component.product.name}
            </CardTitle>
          </div>
          {isSelected && <Check className="h-4 w-4 text-green-500" />}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {component.product.finish}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {component.product.coverage}
          </Badge>
          {getGenderBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Color Swatch */}
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-full border-2 border-gray-200 shadow-inner"
            style={{ backgroundColor: component.product.hex }}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">{component.product.shade}</p>
            <p className="text-xs text-gray-500">{component.product.brand}</p>
            <p className="text-xs text-gray-400">{component.product.hex}</p>
          </div>
        </div>

        {/* Application Info */}
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Technique:</strong> {component.application.technique}</p>
          <p><strong>Tools:</strong> {component.application.tools.join(', ')}</p>
        </div>

        {/* Intensity Slider */}
        {showIntensity && onIntensityChange && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Intensity</span>
              <span>{Math.round(currentIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentIntensity}
              onChange={(e) => handleIntensityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={disabled}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handlePreview();
            }}
            disabled={disabled}
          >
            Preview
          </Button>
          
          {!isSelected && (
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect();
              }}
              disabled={disabled}
            >
              Select
            </Button>
          )}
        </div>

        {/* Hover Overlay */}
        {isHovering && !disabled && (
          <div className="absolute inset-0 bg-black/5 rounded-lg flex items-center justify-center">
            <div className="text-center text-white bg-black/70 px-3 py-2 rounded">
              <p className="text-xs font-medium">Click to select</p>
              <p className="text-xs opacity-75">or Preview</p>
            </div>
          </div>
        )}

        {/* Preview Indicator */}
        {previewMode && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
            Previewing...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component Grid for displaying multiple shade cards
interface ShadeCardGridProps {
  components: MakeupComponent[];
  selectedComponent?: MakeupComponent;
  onSelect: (component: MakeupComponent) => void;
  onPreview: (component: MakeupComponent) => void;
  gender: 'male' | 'female' | 'unisex';
  showIntensity?: boolean;
  maxItems?: number;
}

export function ShadeCardGrid({
  components,
  selectedComponent,
  onSelect,
  onPreview,
  gender,
  showIntensity = false,
  maxItems = 6
}: ShadeCardGridProps) {
  // Filter components by gender compatibility
  const filteredComponents = components.filter(component => {
    if (gender === 'male') {
      return ['beard_oil', 'skin_evening', 'concealer', 'powder', 'brow_gel'].includes(component.type);
    } else if (gender === 'female') {
      return ['foundation', 'concealer', 'eyeshadow', 'eyeliner', 'mascara', 'lipstick', 'lip_liner', 'blush', 'bronzer', 'highlighter', 'brow_gel'].includes(component.type);
    }
    return true; // unisex shows all
  });

  const displayComponents = filteredComponents.slice(0, maxItems);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {displayComponents.map((component, index) => (
        <ShadeCard
          key={`${component.type}-${component.product.shade}-${index}`}
          component={component}
          isSelected={selectedComponent?.product.shade === component.product.shade && 
                     selectedComponent?.type === component.type}
          onSelect={onSelect}
          onPreview={onPreview}
          showIntensity={showIntensity}
          gender={gender}
        />
      ))}
    </div>
  );
}

// Component Type Selector
interface ComponentTypeSelectorProps {
  availableTypes: string[];
  selectedType: string;
  onSelect: (type: string) => void;
  gender: 'male' | 'female' | 'unisex';
}

export function ComponentTypeSelector({
  availableTypes,
  selectedType,
  onSelect,
  gender
}: ComponentTypeSelectorProps) {
  const getGenderFilteredTypes = () => {
    if (gender === 'male') {
      return availableTypes.filter(type => 
        ['beard_oil', 'skin_evening', 'concealer', 'powder', 'brow_gel'].includes(type)
      );
    } else if (gender === 'female') {
      return availableTypes.filter(type => 
        ['foundation', 'concealer', 'eyeshadow', 'eyeliner', 'mascara', 'lipstick', 'lip_liner', 'blush', 'bronzer', 'highlighter', 'brow_gel'].includes(type)
      );
    }
    return availableTypes;
  };

  const filteredTypes = getGenderFilteredTypes();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lipstick':
      case 'lip_liner':
        return <Palette className="h-4 w-4" />;
      case 'eyeshadow':
      case 'eyeliner':
      case 'mascara':
        return <Eye className="h-4 w-4" />;
      case 'beard_oil':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex flex-wrap gap-2">
      {filteredTypes.map((type) => (
        <Button
          key={type}
          variant={selectedType === type ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(type)}
          className="flex items-center gap-2"
        >
          {getTypeIcon(type)}
          <span className="text-xs">{getTypeLabel(type)}</span>
        </Button>
      ))}
    </div>
  );
}
