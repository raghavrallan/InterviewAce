/**
 * PlatformDetectionService - Detects video conferencing platforms
 * Monitors active windows for Zoom, Microsoft Teams, and Google Meet
 */

class PlatformDetectionService {
  constructor() {
    this.detectedPlatform = null;
    this.isInMeeting = false;
    this.onPlatformDetected = null;
    this.onMeetingStart = null;
    this.onMeetingEnd = null;
    this.checkInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Platform detection patterns
   */
  static PLATFORMS = {
    ZOOM: {
      name: 'Zoom',
      patterns: [
        /zoom meeting/i,
        /zoom\.us/i,
        /^zoom$/i
      ],
      color: '#2D8CFF',
      icon: '📹'
    },
    TEAMS: {
      name: 'Microsoft Teams',
      patterns: [
        /microsoft teams/i,
        /teams meeting/i,
        /^teams$/i
      ],
      color: '#6264A7',
      icon: '💼'
    },
    MEET: {
      name: 'Google Meet',
      patterns: [
        /google meet/i,
        /meet\.google\.com/i,
        /^meet$/i
      ],
      color: '#00897B',
      icon: '🎥'
    },
    WEBEX: {
      name: 'Cisco Webex',
      patterns: [
        /webex/i,
        /cisco webex/i
      ],
      color: '#07C160',
      icon: '📞'
    },
    SKYPE: {
      name: 'Skype',
      patterns: [
        /skype/i
      ],
      color: '#00AFF0',
      icon: '☎️'
    }
  };

  /**
   * Check if a platform is supported
   */
  static isSupportedPlatform(platformName) {
    return Object.values(PlatformDetectionService.PLATFORMS)
      .some(p => p.name.toLowerCase() === platformName.toLowerCase());
  }

  /**
   * Detect platform from window title
   */
  detectPlatformFromTitle(title) {
    if (!title) return null;

    for (const [key, platform] of Object.entries(PlatformDetectionService.PLATFORMS)) {
      for (const pattern of platform.patterns) {
        if (pattern.test(title)) {
          return {
            key,
            ...platform
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if window title indicates active meeting
   */
  isMeetingActive(title) {
    if (!title) return false;

    const meetingIndicators = [
      /meeting/i,
      /call/i,
      /\d+ participant/i,
      /in a call/i,
      /zoom meeting/i,
      /teams meeting/i
    ];

    return meetingIndicators.some(pattern => pattern.test(title));
  }

  /**
   * Get list of open windows (Electron-specific)
   */
  async getOpenWindows() {
    try {
      // Use Electron's desktopCapturer to get window list
      const sources = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window'
        }
      }).catch(() => null);

      // Since we can't directly list windows without permissions,
      // we'll use a different approach: check document title in browser

      // For Electron, we can use IPC to get window list from main process
      if (window.electronAPI && window.electronAPI.getOpenWindows) {
        return await window.electronAPI.getOpenWindows();
      }

      // Fallback: detect from browser tabs (for web version)
      return this.detectFromBrowserTabs();
    } catch (error) {
      console.error('Failed to get open windows:', error);
      return [];
    }
  }

  /**
   * Detect video platforms from browser tabs
   */
  detectFromBrowserTabs() {
    const detectedPlatforms = [];

    // Check current page URL and title
    const url = window.location.href;
    const title = document.title;

    // Check if current tab is a video platform
    const platform = this.detectPlatformFromTitle(title) ||
                    this.detectPlatformFromTitle(url);

    if (platform) {
      detectedPlatforms.push({
        title,
        url,
        platform
      });
    }

    return detectedPlatforms;
  }

  /**
   * Start monitoring for video platforms
   */
  startMonitoring(options = {}) {
    if (this.isMonitoring) {
      console.warn('Platform monitoring already active');
      return;
    }

    const {
      interval = 5000, // Check every 5 seconds
      autoActivate = true
    } = options;

    this.isMonitoring = true;
    console.log('🔍 Started monitoring for video platforms');

    // Initial check
    this.checkPlatforms(autoActivate);

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkPlatforms(autoActivate);
    }, interval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isMonitoring = false;
    console.log('⏹️ Stopped monitoring for video platforms');
  }

  /**
   * Check for video platforms
   */
  async checkPlatforms(autoActivate = true) {
    try {
      // Method 1: Check current browser context
      const browserDetection = this.detectFromBrowserTabs();

      // Method 2: Check window titles (Electron only)
      const windowList = await this.getOpenWindows();

      const allDetections = [...browserDetection, ...windowList];

      if (allDetections.length > 0) {
        const detection = allDetections[0]; // Use first detected platform
        const platform = detection.platform;
        const inMeeting = this.isMeetingActive(detection.title);

        // Check if platform changed
        if (!this.detectedPlatform || this.detectedPlatform.key !== platform.key) {
          this.detectedPlatform = platform;

          if (this.onPlatformDetected) {
            this.onPlatformDetected(platform);
          }

          console.log(`✅ Detected platform: ${platform.name}`);
        }

        // Check if meeting status changed
        if (inMeeting && !this.isInMeeting) {
          this.isInMeeting = true;

          if (this.onMeetingStart && autoActivate) {
            this.onMeetingStart(platform);
          }

          console.log(`🎥 Meeting started on ${platform.name}`);
        } else if (!inMeeting && this.isInMeeting) {
          this.isInMeeting = false;

          if (this.onMeetingEnd) {
            this.onMeetingEnd(platform);
          }

          console.log(`⏹️ Meeting ended on ${platform.name}`);
        }
      } else {
        // No platforms detected
        if (this.detectedPlatform) {
          console.log(`❌ ${this.detectedPlatform.name} no longer detected`);
          this.detectedPlatform = null;
        }

        if (this.isInMeeting) {
          this.isInMeeting = false;

          if (this.onMeetingEnd) {
            this.onMeetingEnd(null);
          }
        }
      }
    } catch (error) {
      console.error('Error checking platforms:', error);
    }
  }

  /**
   * Get current platform
   */
  getCurrentPlatform() {
    return this.detectedPlatform;
  }

  /**
   * Check if currently in a meeting
   */
  isCurrentlyInMeeting() {
    return this.isInMeeting;
  }

  /**
   * Set callback for platform detection
   */
  onPlatformDetectedCallback(callback) {
    this.onPlatformDetected = callback;
  }

  /**
   * Set callback for meeting start
   */
  onMeetingStartCallback(callback) {
    this.onMeetingStart = callback;
  }

  /**
   * Set callback for meeting end
   */
  onMeetingEndCallback(callback) {
    this.onMeetingEnd = callback;
  }

  /**
   * Get platform-specific recommendations
   */
  getPlatformRecommendations(platformKey) {
    const recommendations = {
      ZOOM: {
        visibilityMode: 'ghost',
        opacity: 0.05,
        position: 'bottom-right',
        tips: [
          'Use Ghost mode for maximum stealth',
          'Position window in bottom-right corner',
          'Enable "Do Not Disturb" in Zoom settings'
        ]
      },
      TEAMS: {
        visibilityMode: 'stealth',
        opacity: 0.15,
        position: 'top-right',
        tips: [
          'Use Stealth mode during screen sharing',
          'Teams has built-in recording detection',
          'Keep window small and in corner'
        ]
      },
      MEET: {
        visibilityMode: 'adaptive',
        opacity: 0.7,
        position: 'bottom-left',
        tips: [
          'Adaptive mode works well with Meet',
          'Browser-based, easier to hide',
          'Use separate browser profile for privacy'
        ]
      }
    };

    return recommendations[platformKey] || {
      visibilityMode: 'stealth',
      opacity: 0.15,
      position: 'bottom-right',
      tips: ['Use Stealth or Ghost mode for best results']
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopMonitoring();
    this.detectedPlatform = null;
    this.isInMeeting = false;
    this.onPlatformDetected = null;
    this.onMeetingStart = null;
    this.onMeetingEnd = null;

    console.log('🗑️ PlatformDetectionService destroyed');
  }
}

// Export singleton instance
export default new PlatformDetectionService();
