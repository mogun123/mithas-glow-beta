import React from 'react';

type Props = {
  metric: string;
};

const StructuralRenderer: React.FC<Props> = ({ metric }) => {

  if (metric === "elasticity") {
    return <div className="mesh-overlay" />;
  }

  if (metric === "skinAge") {
    return <div className="dna-overlay" />;
  }

  if (metric === "glassSkin") {
    return <div className="scan-overlay" />;
  }

  throw new Error("CLINICAL_ERROR: Invalid structural metric");
};

export default StructuralRenderer;
