import { icons } from 'lucide-react';

interface AppIconProps {
  name: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
  iconImage?: string;
  onDoubleClick: () => void;
}

const AppIcon = ({ name, iconName, iconColor, iconBg, iconImage, onDoubleClick }: AppIconProps) => {
  const LucideIcon = (icons as any)[iconName];

  return (
    <button
      className="flex flex-col items-center gap-1.5 p-2 rounded-lg w-20 hover:bg-white/10 transition-colors duration-150 group cursor-default select-none"
      onDoubleClick={onDoubleClick}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-150 overflow-hidden"
        style={{ background: iconImage ? 'transparent' : iconBg }}
      >
        {iconImage ? (
          <img src={iconImage} alt={name} className="w-full h-full object-contain" />
        ) : (
          LucideIcon && <LucideIcon size={24} color={iconColor} />
        )}
      </div>
      <span className="text-[11px] text-center leading-tight font-medium drop-shadow-md" style={{ color: 'hsl(210, 20%, 92%)' }}>
        {name}
      </span>
    </button>
  );
};

export default AppIcon;
