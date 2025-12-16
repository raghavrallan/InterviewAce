import { motion } from 'framer-motion';
import { Star, Target, Zap, TrendingUp, Award } from 'lucide-react';

function STARMethodGuide({ compact = false }) {
  const steps = [
    {
      letter: 'S',
      title: 'Situation',
      icon: Target,
      color: 'text-purple-300',
      bgColor: 'bg-purple-500/20',
      description: 'Set the scene and provide context',
      example: 'Describe the situation you were in or the task you needed to accomplish'
    },
    {
      letter: 'T',
      title: 'Task',
      icon: Zap,
      color: 'text-blue-300',
      bgColor: 'bg-blue-500/20',
      description: 'Explain what your responsibility was',
      example: 'What was your role? What were you trying to achieve?'
    },
    {
      letter: 'A',
      title: 'Action',
      icon: TrendingUp,
      color: 'text-green-300',
      bgColor: 'bg-green-500/20',
      description: 'Describe the specific actions you took',
      example: 'What did you do? How did you do it? Why did you choose this approach?'
    },
    {
      letter: 'R',
      title: 'Result',
      icon: Award,
      color: 'text-yellow-300',
      bgColor: 'bg-yellow-500/20',
      description: 'Share the outcomes of your actions',
      example: 'What was the outcome? What did you learn? Include metrics if possible'
    }
  ];

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        <Star className="w-3 h-3 text-yellow-300" />
        <span className="text-gray-300">Use STAR Method:</span>
        {steps.map((step, idx) => (
          <span key={idx} className={`${step.color} font-semibold`}>
            {step.letter}
            {idx < steps.length - 1 && ' →'}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="glass-panel-dark p-4 rounded-xl">
      <div className="flex items-center space-x-2 mb-4">
        <Star className="w-5 h-5 text-yellow-300" />
        <h3 className="text-white font-semibold text-sm">STAR Method Framework</h3>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-3 bg-white/5 rounded-lg"
            >
              <div className="flex items-start space-x-3">
                <div className={`${step.bgColor} rounded-lg p-2`}>
                  <Icon className={`w-4 h-4 ${step.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`${step.color} font-bold text-lg`}>{step.letter}</span>
                    <span className="text-white font-medium text-sm">{step.title}</span>
                  </div>
                  <p className="text-gray-300 text-xs mb-2">{step.description}</p>
                  <p className="text-gray-400 text-xs italic">{step.example}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-gray-400 text-xs leading-relaxed">
          <span className="text-white font-semibold">Pro Tip:</span> Keep each section concise.
          Aim for 30 seconds on Situation, 30 seconds on Task, 60 seconds on Action, and
          30 seconds on Result. Practice keeping your total answer under 2-3 minutes.
        </p>
      </div>
    </div>
  );
}

export default STARMethodGuide;
