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
        toast.success('Resume uploaded successfully!');
      } else {
        // Show detailed error message from backend
        const errorMessage = data.error || 'Failed to upload resume';
        toast.error(errorMessage, {
          duration: 5000,
          style: {
            maxWidth: '500px',
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = error.message || 'Failed to upload resume. Please check your connection.';
      toast.error(errorMsg);
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
        toast.success('Job Description uploaded successfully!');

        // Auto-calculate skill match if resume is available
        if (resumeContext) {
          calculateSkillMatch(data.data.parsed, resumeContext);
        }
      } else {
        toast.error(data.error || 'Failed to upload job description');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to upload job description. Please try again.');
    } finally {
      setJdUploading(false);
    }
  };

  const calculateSkillMatch = async (jd, resumeText) => {
    setCalculatingMatch(true);

    try {
      const response = await fetch('http://localhost:5000/api/job-description/skill-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: jd,
          resumeText: resumeText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSkillMatch(data.data);
        toast.success(`Skill match calculated: ${data.data.matchPercentage}%`);
      } else {
        toast.error(data.error || 'Failed to calculate skill match');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to calculate skill match. Please try again.');
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
    <div className="glass-panel h-full flex flex-col p-4 overflow-hidden">
      <h2 className="text-white font-semibold text-lg mb-4 flex-shrink-0">Resume Upload</h2>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
      {!resume ? (
        <motion.div
          {...getRootProps()}
          className={`min-h-[300px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-purple-400 bg-purple-500/20'
              : 'border-white/30 hover:border-white/50 hover:bg-white/5'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4"></div>
              <p className="text-white">Uploading and analyzing...</p>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-16 h-16 text-white/50 mb-4 mx-auto" />
              <p className="text-white text-lg mb-2">
                {isDragActive ? 'Drop your resume here' : 'Upload Your Resume'}
              </p>
              <p className="text-white/50 text-sm">
                Drag & drop or click to browse
              </p>
              <p className="text-white/30 text-xs mt-2">
                Supports PDF, DOC, DOCX, TXT (Max 10MB)
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col">
          {/* Resume Info */}
          <div className="glass-panel-dark p-4 rounded-xl mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-white font-medium">{resume.filename}</p>
                  <p className="text-white/50 text-xs">
                    Uploaded {new Date(resume.uploadedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Check className="w-6 h-6 text-green-400" />
            </div>

            <button
              onClick={() => {
                setResume(null);
                setResumeContext('');
                setResumeSummary('');
                toast.success('Resume cleared');
              }}
              className="w-full glass-button text-white text-sm flex items-center justify-center space-x-2 mt-3"
            >
              <X className="w-4 h-4" />
              <span>Remove Resume</span>
            </button>
          </div>

          {/* Summary */}
          {resumeSummary && (
            <div className="glass-panel-dark p-4 rounded-xl mb-4">
              <h3 className="text-purple-300 font-semibold mb-3">Resume Summary</h3>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                {resumeSummary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Job Description Section */}
      {resume && (
        <div className="mt-4">
          <h3 className="text-white font-semibold text-base mb-3 flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-purple-400" />
            <span>Job Description (Optional)</span>
          </h3>

          {!jobDescription ? (
            <motion.div
              {...getJDRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isJDDragActive
                  ? 'border-purple-400 bg-purple-500/20'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <input {...getJDInputProps()} />

              {jdUploading ? (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-3"></div>
                  <p className="text-white text-sm">Parsing job description...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Target className="w-12 h-12 text-purple-400/70 mb-3 mx-auto" />
                  <p className="text-white text-sm mb-1">
                    {isJDDragActive ? 'Drop job description here' : 'Upload Job Description'}
                  </p>
                  <p className="text-white/40 text-xs">
                    For skill matching and tailored answers
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    PDF, DOCX, TXT
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <div>
              {/* JD Info */}
              <div className="glass-panel-dark p-3 rounded-xl mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-6 h-6 text-purple-400" />
                    <div>
                      <p className="text-white font-medium text-sm">{jobDescription.filename}</p>
                      <p className="text-white/50 text-xs">
                        {jobDescription.parsed.jobTitle || 'Job Title'}
                        {jobDescription.parsed.company && ` at ${jobDescription.parsed.company}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setJobDescription(null);
                      setSkillMatch(null);
                      toast.success('Job description cleared');
                    }}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Skills Preview */}
                {jobDescription.parsed.requiredSkills && jobDescription.parsed.requiredSkills.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-white/60 text-xs mb-1">Required Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {jobDescription.parsed.requiredSkills.slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                      {jobDescription.parsed.requiredSkills.length > 5 && (
                        <span className="px-2 py-0.5 bg-white/10 text-white/50 text-xs rounded-full">
                          +{jobDescription.parsed.requiredSkills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Skill Match */}
              {skillMatch && (
                <div className="glass-panel-dark p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold text-sm flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span>Skill Match Analysis</span>
                    </h4>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                      skillMatch.matchPercentage >= 70 ? 'bg-green-500/30 text-green-300' :
                      skillMatch.matchPercentage >= 50 ? 'bg-yellow-500/30 text-yellow-300' :
                      'bg-red-500/30 text-red-300'
                    }`}>
                      {skillMatch.matchPercentage}% Match
                    </div>
                  </div>

                  {/* Matched Skills */}
                  {skillMatch.matchedSkills && skillMatch.matchedSkills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-green-300 text-xs font-semibold mb-2 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Matched Skills ({skillMatch.matchedSkills.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {skillMatch.matchedSkills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/30">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {skillMatch.missingSkills && skillMatch.missingSkills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-orange-300 text-xs font-semibold mb-2 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Skills to Highlight ({skillMatch.missingSkills.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {skillMatch.missingSkills.slice(0, 8).map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded border border-orange-500/30">
                            {skill}
                          </span>
                        ))}
                        {skillMatch.missingSkills.length > 8 && (
                          <span className="px-2 py-1 bg-white/10 text-white/50 text-xs rounded">
                            +{skillMatch.missingSkills.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Overall Assessment */}
                  {skillMatch.overallAssessment && (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-white/80 text-xs leading-relaxed">
                        {skillMatch.overallAssessment}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {calculatingMatch && (
                <div className="glass-panel-dark p-4 rounded-xl flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mr-3"></div>
                  <p className="text-white text-sm">Calculating skill match...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default ResumeTab;
