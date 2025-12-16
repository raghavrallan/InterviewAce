import { useState } from 'react';
import { Upload, FileText, Check, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

function ResumeTab() {
  const { resume, setResume, setResumeContext, setResumeSummary, resumeSummary } = useStore();
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="glass-panel h-full flex flex-col p-4">
      <h2 className="text-white font-semibold text-lg mb-4">Resume Upload</h2>

      {!resume ? (
        <motion.div
          {...getRootProps()}
          className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
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
        <div className="flex-1 flex flex-col">
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
            <div className="flex-1 glass-panel-dark p-4 rounded-xl overflow-y-auto custom-scrollbar">
              <h3 className="text-purple-300 font-semibold mb-3">Resume Summary</h3>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                {resumeSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ResumeTab;
