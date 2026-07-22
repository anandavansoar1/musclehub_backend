// @desc    Get app version info, update details and release notes
// @route   GET /api/app/version
// @access  Public
const getAppVersion = async (req, res) => {
    try {
        res.json({
            latestVersion: '1.0.1',
            minSupportedVersion: '1.0.0',
            forceUpdate: false,
            updateUrl: 'https://github.com', // Replace with direct APK download URL or Play Store/App Store link
            releaseNotes: [
                'Instant attendance QR scanner optimization',
                'Auto member-linking for active memberships',
                'Swipe pull-to-refresh on all screens',
                'Performance and stability improvements'
            ]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAppVersion };
