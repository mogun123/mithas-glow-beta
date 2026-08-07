import ProfessionalProfileTabs from './ProfessionalProfileTabs';

interface ProfessionalProfileProps {
  artistId: string;
  onBack?: () => void;
}

export default function ProfessionalProfile(props: ProfessionalProfileProps) {
  return <ProfessionalProfileTabs {...props} />;
}
