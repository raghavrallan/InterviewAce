import { useState } from 'react';
import { Upload, FileText, Check, X, Briefcase, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

function ResumeTab() {
  const { resume, setResume, setResumeContext, setResumeSummary, resumeSummary, resumeContext } = useStore();
  const [uploading, setUploading] = useState(false);
  const [jobDescription, setJobDescription] = useState(null);
  const [jdUploading, setJdUploading] = useState(false);
  const [skillMatch, setSkillMatch] = useState(null);
  const [calculatingMatch, setCalculatingMatch] = useState(false);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('http://localhost:5000/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResume({
          filename: data.data.filename,
          uploadedAt: new Date().toISOString(),
        });
        setResumeContext(data.data.text);
        setResumeSummary(data.data.summary);
        toast.success('Resume uploaded');
      } else {
        toast.error(data.error || 'Upload failed', { duration: 4000 });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Connection error');
    } finally {
      setUploading(false);
    }
  };

  const onJDDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setJdUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/job-description/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setJobDescription({
          filename: file.name,
          parsed: data.data.parsed,
          rawText: data.data.rawText,
          uploadedAt: new Date().toISOString(),
        });
        toast.success('JD uploaded');

        if (resumeContext) {
          calculateSkillMatch(data.data.parsed, resumeContext);
        }
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Connection error');
    } finally {
      setJdUploading(false);
    }
  };

  const calculateSkillMatch = async (jd, resumeText) => {
    setCalculatingMatch(true);

    try {
      const response = await fetch('http://localhost:5000/api/job-description/skill-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jd,
          resumeText: resumeText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSkillMatch(data.data);
        toast.success(`${data.data.matchPercentage}% match`);
      } else {
        toast.error(data.error || 'Match calculation failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Connection error');
    } finally {
      setCalculatingMatch(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const { getRootProps: getJDRootProps, getInputProps: getJDInputProps, isDragActive: isJDDragActive } = useDropzone({
    onDrop: onJDDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: jdUploading,
  });

  return (
    <div className="h-full flex flex-col p-0 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5">
        <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">Resume & JD</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-2 space-y-2">
        {/* Resume Upload / Info */}
        {!resume ? (
          <motion.div
            {...getRootProps()}
            className={`border border-dashed rounded-xl flex flex-col items-center justify-center py-8 px-4 cursor-pointer transition-all ${
              isDragActive
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-white/15 hover:border-white/30 hover:bg-white/[0.02]'
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <input {...getInputProps()} />

            {uploading ? (
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-3 mx-auto"></div>
                <p className="text-white/60 text-xs">Analyzing...</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-8 h-8 text-white/25 mb-2 mx-auto" />
                <p className="text-white/60 text-sm mb-1">
                  {isDragActive ? 'Drop here' : 'Upload Resume'}
                </p>
                <p className="text-white/25 text-[10px]">
                  PDF, DOC, DOCX, TXT (Max 10MB)
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {/* Resume Card */}
            <div className="glass-panel-dark p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{resume.filename}</p>
                    <p className="text-white/30 text-[10px]">
                      {new Date(resume.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-green-400" />
                  <button
                    onClick={() => {
                      setResume(null);
                      setResumeContext('');
                      setResumeSummary('');
                      toast.success('Cleared');
                    }}
                    className="p-1 rounded hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            {resumeSummary && (
              <div className="glass-panel-dark p-3 rounded-xl">
                <p className="text-purple-300/70 text-[10px] font-semibold uppercase mb-1.5">Summary</p>
                <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">
                  {resumeSummary}
                </p>
              </div>
            )}
          </>
        )}

        {/* Job Description Section */}
        {resume && (
          <>
            <div className="flex items-center space-x-1.5 pt-1">
              <Briefcase className="w-3 h-3 text-purple-400/60" />
              <span className="text-white/40 text-[10px] font-semibold uppercase">Job Description</span>
            </div>

            {!jobDescription ? (
              <motion.div
                {...getJDRootProps()}
                className={`border border-dashed rounded-xl flex flex-col items-center justify-center py-5 px-4 cursor-pointer transition-all ${
                  isJDDragActive
                    ? 'border-purple-400 bg-purple-500/10'
                    : 'border-white/10 hover:border-white/25 hover:bg-white/[0.02]'
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <input {...getJDInputProps()} />

                {jdUploading ? (
                  <div className="text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mb-2 mx-auto"></div>
                    <p className="text-white/50 text-xs">Parsing...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Target className="w-6 h-6 text-purple-400/30 mb-1.5 mx-auto" />
                    <p className="text-white/50 text-xs mb-0.5">
                      {isJDDragActive ? 'Drop here' : 'Upload JD'}
                    </p>
                    <p className="text-white/20 text-[10px]">For skill matching</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <>
                {/* JD Card */}
                <div className="glass-panel-dark p-3 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Briefcase className="w-4 h-4 text-purple-400/70" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-medium truncate">{jobDescription.filename}</p>
                        <p className="text-white/30 text-[10px]">
                          {jobDescription.parsed.jobTitle || 'Job Title'}
                          {jobDescription.parsed.company && ` @ ${jobDescription.parsed.company}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setJobDescription(null);
                        setSkillMatch(null);
                        toast.success('Cleared');
                      }}
                      className="p-1 rounded hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Skills Preview */}
                  {jobDescription.parsed.requiredSkills && jobDescription.parsed.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-white/5">
                      {jobDescription.parsed.requiredSkills.slice(0, 6).map((skill, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-300/70 text-[10px] rounded">
                          {skill}
                        </span>
                      ))}
                      {jobDescription.parsed.requiredSkills.length > 6 && (
                        <span className="px-1.5 py-0.5 bg-white/5 text-white/30 text-[10px] rounded">
                          +{jobDescription.parsed.requiredSkills.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Skill Match */}
                {skillMatch && (
                  <div className="glass-panel-dark p-3 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1.5">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-white/60 text-[10px] font-semibold uppercase">Skill Match</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        skillMatch.matchPercentage >= 70 ? 'bg-green-500/20 text-green-300' :
                        skillMatch.matchPercentage >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {skillMatch.matchPercentage}%
                      </div>
                    </div>

                    {/* Match Progress Bar */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full mb-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skillMatch.matchPercentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          skillMatch.matchPercentage >= 70 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                          skillMatch.matchPercentage >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                          'bg-gradient-to-r from-red-500 to-red-400'
                        }`}
                      />
                    </div>

                    {/* Matched Skills */}
                    {skillMatch.matchedSkills && skillMatch.matchedSkills.length > 0 && (
                      <div className="mb-2">
                        <p className="text-green-300/60 text-[10px] font-medium mb-1 flex items-center space-x-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Matched ({skillMatch.matchedSkills.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {skillMatch.matchedSkills.map((skill, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-green-500/10 text-green-300/80 text-[10px] rounded border border-green-500/15">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills */}
                    {skillMatch.missingSkills && skillMatch.missingSkills.length > 0 && (
                      <div className="mb-2">
                        <p className="text-orange-300/60 text-[10px] font-medium mb-1 flex items-center space-x-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>To Improve ({skillMatch.missingSkills.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {skillMatch.missingSkills.slice(0, 8).map((skill, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-300/80 text-[10px] rounded border border-orange-500/15">
                              {skill}
                            </span>
                          ))}
                          {skillMatch.missingSkills.length > 8 && (
                            <span className="px-1.5 py-0.5 bg-white/5 text-white/30 text-[10px] rounded">
                              +{skillMatch.missingSkills.length - 8}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Assessment */}
                    {skillMatch.overallAssessment && (
                      <div className="p-2 bg-white/[0.03] rounded-lg mt-1">
                        <p className="text-white/50 text-[10px] leading-relaxed">
                          {skillMatch.overallAssessment}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {calculatingMatch && (
                  <div className="glass-panel-dark p-3 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mr-2"></div>
                    <p className="text-white/50 text-xs">Calculating match...</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ResumeTab;
