import React from 'react';
import { ScanResult } from './SkinScanner';

export interface AnalysisResultProps {
  result: ScanResult;
  onSaveProfile?: () => void;
  onRetakeScan?: () => void;
  onShareResults?: () => void;
  className?: string;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({
  result,
  onSaveProfile,
  onRetakeScan,
  onShareResults,
  className = '',
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#00ff00';
    if (confidence >= 60) return '#ffaa00';
    return '#ff0000';
  };

  const getConditionSeverityColor = (severity: number) => {
    if (severity <= 30) return '#00ff00';
    if (severity <= 60) return '#ffaa00';
    return '#ff0000';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`analysis-result ${className}`}>
      <div className="result-header">
        <h2>Skin Analysis Complete</h2>
        <div className="timestamp">
          Scanned on {formatDate(result.scanTimestamp)}
        </div>
        <div 
          className="confidence-badge"
          style={{ 
            backgroundColor: getConfidenceColor(result.confidence.overallScore),
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {result.confidence.overallScore.toFixed(1)}% Confidence
        </div>
      </div>

      <div className="result-grid">
        {/* Skin Tone Section */}
        <div className="result-section">
          <h3>Skin Tone & Undertone</h3>
          <div className="tone-display">
            <div 
              className="tone-preview"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: `lab(${result.labValues.l}%, ${result.labValues.a}%, ${result.labValues.b}%)`,
                border: '2px solid #ddd',
                marginRight: '16px',
              }}
            />
            <div className="tone-details">
              <div className="tone-primary">
                <strong>{result.skinTone.skinTone}</strong>
              </div>
              <div className="tone-secondary">
                {result.undertone.undertone} Undertone
              </div>
              <div className="tone-metadata">
                <small>
                  Fitzpatrick Type {result.skinTone.metadata.FitzpatrickType || 'N/A'} • 
                  Warmth {result.skinTone.metadata.warmthLevel?.toFixed(1) || 'N/A'}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Face Shape Section */}
        <div className="result-section">
          <h3>Face Shape</h3>
          <div className="face-shape-display">
            <div className="shape-icon">
              {/* Simple face shape icon */}
              <div 
                className="shape-outline"
                style={{
                  width: '40px',
                  height: '50px',
                  border: '2px solid #333',
                  borderRadius: 
                    result.faceShape.faceShape === 'Round' ? '50%' :
                    result.faceShape.faceShape === 'Square' ? '10%' :
                    result.faceShape.faceShape === 'Heart' ? '50% 50% 0 0' :
                    result.faceShape.faceShape === 'Diamond' ? '50% 50% 50% 0' :
                    result.faceShape.faceShape === 'Oblong' ? '50% / 60% 60% 40% 40%' :
                    '50% 50% 45% 45%',
                  marginRight: '12px',
                }}
              />
            </div>
            <div className="shape-details">
              <div className="shape-name">
                <strong>{result.faceShape.faceShape}</strong>
              </div>
              <div className="shape-confidence">
                {result.faceShape.confidence.toFixed(1)}% confident
              </div>
              <div className="shape-characteristics">
                <small>
                  {result.faceShape.characteristics.jawline} jawline • 
                  {result.faceShape.characteristics.forehead} forehead
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Skin Age Section */}
        <div className="result-section">
          <h3>Skin Age Analysis</h3>
          <div className="age-display">
            <div className="age-number">
              <span className="age-value">{result.skinAge.estimatedAge}</span>
              <span className="age-unit">years</span>
            </div>
            <div className="age-category">
              <span className="category-badge">{result.skinAge.ageCategory}</span>
            </div>
            <div className="age-factors">
              <div className="factor-bar">
                <span>Fine Lines:</span>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${result.skinAge.factors.fineLines}%`,
                      backgroundColor: getConditionSeverityColor(result.skinAge.factors.fineLines)
                    }}
                  />
                </div>
              </div>
              <div className="factor-bar">
                <span>Brightness:</span>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${100 - result.skinAge.factors.brightness}%`,
                      backgroundColor: getConditionSeverityColor(result.skinAge.factors.brightness)
                    }}
                  />
                </div>
              </div>
              <div className="factor-bar">
                <span>Texture:</span>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${result.skinAge.factors.textureVariance}%`,
                      backgroundColor: getConditionSeverityColor(result.skinAge.factors.textureVariance)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skin Conditions Section */}
        <div className="result-section">
          <h3>Skin Conditions</h3>
          <div className="conditions-grid">
            {Object.entries(result.skinConditions.conditions).map(([condition, data]) => {
              if (data.severity < 20) return null; // Hide very low severity conditions
              
              return (
                <div key={condition} className="condition-card">
                  <div className="condition-header">
                    <span className="condition-name">
                      {condition.replace('-', ' ').charAt(0).toUpperCase() + 
                       condition.replace('-', ' ').slice(1)}
                    </span>
                    <span 
                      className="severity-indicator"
                      style={{ color: getConditionSeverityColor(data.severity) }}
                    >
                      {data.severity.toFixed(0)}%
                    </span>
                  </div>
                  <div className="condition-progress">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${data.severity}%`,
                        backgroundColor: getConditionSeverityColor(data.severity)
                      }}
                    />
                  </div>
                  {data.affectedAreas.length > 0 && (
                    <div className="affected-areas">
                      <small>Areas: {data.affectedAreas.join(', ')}</small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="result-section recommendations">
          <h3>Personalized Recommendations</h3>
          
          {/* Skincare Recommendations */}
          {result.skinConditions.recommendations.skincare.length > 0 && (
            <div className="recommendation-group">
              <h4>Skincare</h4>
              <ul className="recommendation-list">
                {result.skinConditions.recommendations.skincare.slice(0, 3).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Makeup Recommendations */}
          {result.skinConditions.recommendations.makeup.length > 0 && (
            <div className="recommendation-group">
              <h4>Makeup</h4>
              <ul className="recommendation-list">
                {result.skinConditions.recommendations.makeup.slice(0, 3).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Lifestyle Recommendations */}
          {result.skinConditions.recommendations.lifestyle.length > 0 && (
            <div className="recommendation-group">
              <h4>Lifestyle</h4>
              <ul className="recommendation-list">
                {result.skinConditions.recommendations.lifestyle.slice(0, 2).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quality Metrics */}
        <div className="result-section quality-metrics">
          <h3>Scan Quality</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Face Detection</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${result.confidence.factors.faceDetection.confidence}%`,
                    backgroundColor: getConfidenceColor(result.confidence.factors.faceDetection.confidence)
                  }}
                />
              </div>
              <span className="metric-value">
                {result.confidence.factors.faceDetection.confidence.toFixed(0)}%
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Frame Quality</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${result.confidence.factors.frameQuality.blurScore}%`,
                    backgroundColor: getConfidenceColor(result.confidence.factors.frameQuality.blurScore)
                  }}
                />
              </div>
              <span className="metric-value">
                {result.confidence.factors.frameQuality.blurScore.toFixed(0)}%
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Lighting</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${result.confidence.factors.lighting.uniformity}%`,
                    backgroundColor: getConfidenceColor(result.confidence.factors.lighting.uniformity)
                  }}
                />
              </div>
              <span className="metric-value">
                {result.confidence.factors.lighting.uniformity.toFixed(0)}%
              </span>
            </div>
            
            <div className="metric-item">
              <span className="metric-label">Data Consistency</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill"
                  style={{ 
                    width: `${result.confidence.factors.dataConsistency.sampleSize}%`,
                    backgroundColor: getConfidenceColor(result.confidence.factors.dataConsistency.sampleSize)
                  }}
                />
              </div>
              <span className="metric-value">
                {result.confidence.factors.dataConsistency.sampleSize.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="result-actions">
        {onSaveProfile && (
          <button onClick={onSaveProfile} className="btn btn-primary">
            Save Profile
          </button>
        )}
        
        {onRetakeScan && (
          <button onClick={onRetakeScan} className="btn btn-secondary">
            Retake Scan
          </button>
        )}
        
        {onShareResults && (
          <button onClick={onShareResults} className="btn btn-outline">
            Share Results
          </button>
        )}
      </div>
    </div>
  );
};
