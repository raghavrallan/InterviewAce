import { FileText, MessageSquare, Upload, Settings, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

const tabs = [
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'practice', label: 'Practice', icon: Target },
  { id: 'resume', label: 'Resume', icon: Upload },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function TabBar() {
  const { activeTab, setActiveTab } = useStore();

  return (
    <div className="glass-panel flex items-center justify-around px-2 py-2 mt-4 no-drag">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-300 ${
              isActive
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs mt-1">{tab.label}</span>

            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default TabBar;
