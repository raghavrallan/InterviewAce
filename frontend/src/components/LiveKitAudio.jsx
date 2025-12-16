import { useEffect, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

function LiveKitAudio() {
  const { addTranscript, setIsConnected, setLiveKitRoom } = useStore();
  const [room, setRoom] = useState(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState('');

  useEffect(() => {
    let livekitRoom = null;

    const connectToLiveKit = async () => {
      try {
        // Create room and get token from backend
        const response = await fetch('http://localhost:5000/api/livekit/create-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantName: 'Candidate' }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error('Failed to create LiveKit room');
        }

        // Connect to LiveKit room
        livekitRoom = new Room();

        // Set up event listeners
        livekitRoom.on(RoomEvent.Connected, () => {
          console.log('Connected to LiveKit');
          setIsConnected(true);
        });

        livekitRoom.on(RoomEvent.Disconnected, () => {
          console.log('Disconnected from LiveKit');
          setIsConnected(false);
        });

        // Handle audio tracks (this is where you'd integrate actual STT)
        livekitRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          console.log('Track subscribed:', track.kind);

          // In a real implementation, you would:
          // 1. Get audio stream from track
          // 2. Send to STT service (e.g., Deepgram, AssemblyAI, or OpenAI Whisper)
          // 3. Process transcription results

          // For demo purposes, we'll simulate transcription
          simulateTranscription();
        });

        // Connect to room
        await livekitRoom.connect(data.data.wsUrl, data.data.token);

        setRoom(livekitRoom);
        setLiveKitRoom(data.data.roomName, data.data.token);

        // Enable microphone
        await livekitRoom.localParticipant.setMicrophoneEnabled(true);

        toast.success('Connected to audio service');
      } catch (error) {
        console.error('LiveKit connection error:', error);
        toast.error('Failed to connect to audio service');
      }
    };

    connectToLiveKit();

    return () => {
      if (livekitRoom) {
        livekitRoom.disconnect();
      }
    };
  }, []);

  // Simulate transcription for demo purposes
  // In production, replace this with actual STT service integration
  const simulateTranscription = () => {
    const sampleQuestions = [
      'Tell me about yourself and your background.',
      'What are your greatest strengths?',
      'Why do you want to work here?',
      'Describe a challenging project you worked on.',
      'Where do you see yourself in five years?',
    ];

    let questionIndex = 0;

    const interval = setInterval(() => {
      if (questionIndex < sampleQuestions.length) {
        const transcript = {
          id: Date.now() + Math.random(),
          text: sampleQuestions[questionIndex],
          speaker: 'Interviewer',
          timestamp: new Date().toISOString(),
          isFinal: true,
        };

        addTranscript(transcript);
        questionIndex++;
      } else {
        clearInterval(interval);
      }
    }, 8000); // Add a new question every 8 seconds

    return () => clearInterval(interval);
  };

  return (
    <div className="hidden">
      {/* This component handles LiveKit connection in the background */}
      {/* In production, add visual indicators or audio visualizations here */}
    </div>
  );
}

export default LiveKitAudio;
