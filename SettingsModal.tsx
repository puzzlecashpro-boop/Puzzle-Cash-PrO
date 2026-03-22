import { X, Volume2, Bell, Moon, HelpCircle, Shield, LogOut } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-card rounded-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-gaming font-semibold text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-2">
          <SettingItem icon={Volume2} label="Sound Effects" hasToggle defaultOn />
          <SettingItem icon={Bell} label="Notifications" hasToggle defaultOn />
          <SettingItem icon={Moon} label="Dark Mode" hasToggle defaultOn />
          <div className="my-2 border-t border-border" />
          <SettingItem icon={HelpCircle} label="Help & Support" />
          <SettingItem icon={Shield} label="Privacy Policy" />
          <div className="my-2 border-t border-border" />
          <SettingItem icon={LogOut} label="Sign Out" danger />
        </div>
      </div>
    </div>
  );
}

function SettingItem({
  icon: Icon,
  label,
  hasToggle,
  defaultOn,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  hasToggle?: boolean;
  defaultOn?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors ${
        danger ? 'text-destructive' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} />
        <span className="font-medium">{label}</span>
      </div>
      {hasToggle && (
        <div
          className={`w-10 h-6 rounded-full transition-colors relative ${
            defaultOn ? 'bg-neon-cyan' : 'bg-muted'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              defaultOn ? 'left-5' : 'left-1'
            }`}
          />
        </div>
      )}
    </button>
  );
}
