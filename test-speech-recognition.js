/**
 * Speech Recognition Test Script
 * Paste this in Browser DevTools Console to test voice recognition
 */

console.log('🧪 Starting Speech Recognition Test...\n');

// Test 1: Check if Web Speech API is supported
console.log('TEST 1: Checking Web Speech API Support');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  console.error('❌ FAIL: Web Speech API not supported in this browser');
  console.log('   Please use Chrome, Edge, or Safari');
} else {
  console.log('✅ PASS: Web Speech API is supported');
}

// Test 2: Check microphone permissions
console.log('\nTEST 2: Checking Microphone Permissions');
navigator.permissions.query({ name: 'microphone' })
  .then((permissionStatus) => {
    console.log(`   Microphone Permission: ${permissionStatus.state}`);
    if (permissionStatus.state === 'granted') {
      console.log('✅ PASS: Microphone permission granted');
    } else if (permissionStatus.state === 'prompt') {
      console.log('⚠️  WARN: Microphone permission will be requested');
    } else {
      console.log('❌ FAIL: Microphone permission denied');
    }
  })
  .catch((err) => {
    console.warn('⚠️  Could not check microphone permission:', err.message);
  });

// Test 3: Try to initialize Speech Recognition
console.log('\nTEST 3: Initializing Speech Recognition');
if (SpeechRecognition) {
  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    console.log('✅ PASS: Recognition object created successfully');
    console.log(`   Language: ${recognition.lang}`);
    console.log(`   Continuous: ${recognition.continuous}`);
    console.log(`   Interim Results: ${recognition.interimResults}`);

    // Test 4: Test event handlers
    console.log('\nTEST 4: Setting up event handlers');

    recognition.onstart = () => {
      console.log('✅ EVENT: Recognition started - Speak now!');
      console.log('   Say something like: "Hello this is a test"');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          final += transcript;
          console.log(`✅ FINAL TRANSCRIPT: "${transcript}" (confidence: ${confidence?.toFixed(2) || 'N/A'})`);
        } else {
          interim += transcript;
          console.log(`   Interim: "${transcript}"`);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error(`❌ ERROR: ${event.error}`);
      if (event.error === 'not-allowed') {
        console.log('   → Microphone permission was denied');
        console.log('   → Please allow microphone access in browser settings');
      } else if (event.error === 'no-speech') {
        console.log('   → No speech detected');
        console.log('   → Make sure your microphone is working');
      } else if (event.error === 'network') {
        console.log('   → Network error (common in Electron, usually safe to ignore)');
      }
    };

    recognition.onend = () => {
      console.log('📴 Recognition ended');
    };

    console.log('✅ PASS: Event handlers set up successfully');

    // Test 5: Start recognition
    console.log('\nTEST 5: Starting Speech Recognition');
    console.log('⏳ Click ALLOW when prompted for microphone access');
    console.log('🎤 Speak clearly into your microphone after it starts\n');

    setTimeout(() => {
      try {
        recognition.start();
        console.log('🎙️  Recognition START command sent');
        console.log('   Waiting for onstart event...\n');
      } catch (err) {
        console.error('❌ FAIL: Could not start recognition:', err.message);
      }
    }, 1000);

    // Auto-stop after 10 seconds
    setTimeout(() => {
      try {
        recognition.stop();
        console.log('\n⏹️  Test completed - Recognition stopped');
        console.log('\n📊 TEST SUMMARY:');
        console.log('   If you saw "✅ EVENT: Recognition started" - Speech API is working!');
        console.log('   If you saw transcript logs - Voice recognition is working!');
        console.log('   If not, check the errors above');
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }, 10000);

  } catch (err) {
    console.error('❌ FAIL: Could not create recognition object:', err.message);
  }
}

// Test 6: Check if Start button exists in DOM
console.log('\nTEST 6: Checking UI Elements');
setTimeout(() => {
  const startButton = document.querySelector('button[title*="Start"]') ||
                     document.querySelector('button:has(svg)');
  if (startButton) {
    console.log('✅ PASS: Start button found in DOM');
    console.log('   Button text:', startButton.textContent);
  } else {
    console.log('⚠️  WARN: Could not find Start button');
  }
}, 500);

console.log('\n' + '='.repeat(60));
console.log('Test script loaded. Results will appear above.');
console.log('The recognition will run for 10 seconds.');
console.log('Speak into your microphone to test!');
console.log('='.repeat(60) + '\n');
