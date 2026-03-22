import { Megaphone } from 'lucide-react';

export default function BannerAd() {
  return (
    <div 
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        width: '100%', 
        zIndex: 9999,
        backgroundColor: '#222'
      }}
      className="flex justify-center p-3 border-t border-gray-600"
    >
      <div 
        style={{ width: '320px', height: '50px', backgroundColor: '#333' }}
        className="rounded-lg border border-gray-500 flex items-center justify-center gap-2"
      >
        <Megaphone className="w-5 h-5 text-white" />
        <span className="text-white text-sm font-bold">Advertisement - 320x50</span>
      </div>
    </div>
  );
}
