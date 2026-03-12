import * as LucideIcons from 'lucide-react';

export default function IconRenderer({ name, size = 16, color = 'currentColor', className = '' }) {
  const IconComponent = LucideIcons[name];

  if (!IconComponent) {
    // Default fallback icon
    const Fallback = LucideIcons['CircleDashed'];
    return <Fallback size={size} color={color} className={className} />;
  }

  return <IconComponent size={size} color={color} className={className} />;
}

export const AVAILABLE_ICONS = [
  'Gamepad2', 'Briefcase', 'Home', 'ShieldCheck', 'MoreHorizontal',
  'Utensils', 'Bus', 'Zap', 'Pill', 'Landmark', 'Gift', 'TrendingUp',
  'Plane', 'BedDouble', 'Ticket', 'ShoppingBag', 'Car', 'Coffee',
  'Smartphone', 'Monitor', 'BookOpen', 'Music', 'Dumbbell', 'Scissors',
  'HeartPulse', 'Baby', 'Dog', 'Cat', 'Camera', 'Palmtree'
];
