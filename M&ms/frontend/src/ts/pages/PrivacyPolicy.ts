// Privacy Policy page component

export class PrivacyPolicyPage {
    private container: HTMLElement | null;

    constructor() {
        this.container = document.getElementById('privacyPolicySection');
        this.render();
    }

    private render(): void {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="max-w-4xl mx-auto py-8 px-4">
                <h1 class="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
                
                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <p class="text-gray-300 mb-6">
                        Last updated: January 17, 2026
                    </p>
                    <p class="text-gray-300 mb-6">
                        This Privacy Policy describes how M&ms Pong Game ("we", "us", or "our") collects, uses, and protects your personal information when you use our online multiplayer pong gaming platform.
                    </p>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Information We Collect
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <div>
                            <h3 class="text-lg font-semibold text-white mb-2">Account Information</h3>
                            <p>When you register for an account, we collect:</p>
                            <ul class="list-disc pl-6 mt-2 space-y-1">
                                <li>Username and display name</li>
                                <li>Email address</li>
                                <li>Password (encrypted)</li>
                                <li>Profile information (avatar, date of birth, gender - optional)</li>
                                <li>Two-factor authentication data (if enabled)</li>
                            </ul>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-white mb-2">OAuth Authentication</h3>
                            <p>If you sign in using Google OAuth, we receive:</p>
                            <ul class="list-disc pl-6 mt-2 space-y-1">
                                <li>Your Google account email address</li>
                                <li>Your Google profile name and picture</li>
                                <li>Basic profile information as permitted by your Google account settings</li>
                            </ul>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-white mb-2">Gaming and Usage Data</h3>
                            <p>We collect information about your activity on the platform:</p>
                            <ul class="list-disc pl-6 mt-2 space-y-1">
                                <li>Game statistics (wins, losses, scores)</li>
                                <li>Match history and gameplay data</li>
                                <li>Tournament participation records</li>
                                <li>Chat messages and AI assistant interactions</li>
                                <li>Leaderboard rankings and achievements</li>
                                <li>Friend connections and social interactions</li>
                            </ul>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-white mb-2">Technical Data</h3>
                            <p>We automatically collect:</p>
                            <ul class="list-disc pl-6 mt-2 space-y-1">
                                <li>IP address and location data</li>
                                <li>Browser type and version</li>
                                <li>Device information</li>
                                <li>Connection timestamps and session duration</li>
                                <li>Performance and error logs</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How We Use Your Information
                    </h2>
                    <div class="text-gray-300 space-y-2">
                        <p>We use collected information for the following purposes:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Account Management:</strong> To create, maintain, and secure your account</li>
                            <li><strong>Game Services:</strong> To enable multiplayer gaming, matchmaking, tournaments, and leaderboards</li>
                            <li><strong>Communication:</strong> To facilitate chat functionality and AI assistant features</li>
                            <li><strong>Personalization:</strong> To customize your gaming experience and display relevant content</li>
                            <li><strong>Security:</strong> To protect against fraud, unauthorized access, and abuse</li>
                            <li><strong>Analytics:</strong> To understand usage patterns and improve our services</li>
                            <li><strong>Support:</strong> To respond to your inquiries and provide technical assistance</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Data Storage and Security
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>We implement industry-standard security measures to protect your data:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li>All data transmissions are encrypted using HTTPS/TLS protocols</li>
                            <li>Passwords are hashed using bcrypt encryption</li>
                            <li>Database access is restricted and monitored</li>
                            <li>Two-factor authentication is available for enhanced security</li>
                            <li>Regular security audits and updates</li>
                            <li>Data is stored in secure PostgreSQL and Redis databases</li>
                            <li>WebSocket connections are authenticated and secured</li>
                        </ul>
                        <p class="mt-4">
                            While we strive to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Cookies and Local Storage
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>We use cookies and browser local storage to:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Authentication Tokens:</strong> To keep you logged in (JWT tokens stored in localStorage)</li>
                            <li><strong>Session Management:</strong> To maintain your active gaming sessions</li>
                            <li><strong>Preferences:</strong> To remember your language, theme, and game settings</li>
                            <li><strong>Performance:</strong> To cache data and reduce server requests</li>
                        </ul>
                        <p class="mt-4">
                            You can control cookies through your browser settings, but disabling them may limit functionality.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Data Sharing and Third Parties
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>We do not sell your personal information. We may share data with:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Google OAuth:</strong> For authentication services (governed by Google's privacy policy)</li>
                            <li><strong>Gemini AI:</strong> For AI assistant functionality (chat content only)</li>
                            <li><strong>Service Providers:</strong> Infrastructure providers that help us deliver our services</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Data Retention
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>We retain your information for as long as:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li>Your account remains active</li>
                            <li>Needed to provide services to you</li>
                            <li>Required to comply with legal obligations</li>
                            <li>Necessary to resolve disputes or enforce agreements</li>
                        </ul>
                        <p class="mt-4">
                            When you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Your Rights
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>You have the right to:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                            <li><strong>Portability:</strong> Receive your data in a structured, commonly used format</li>
                            <li><strong>Objection:</strong> Object to certain processing of your data</li>
                            <li><strong>Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
                        </ul>
                        <p class="mt-4">
                            To exercise these rights, please contact us using the information below.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Children's Privacy
                    </h2>
                    <div class="text-gray-300">
                        <p>
                            Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Changes to This Policy
                    </h2>
                    <div class="text-gray-300">
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes. Continued use of our service after changes constitutes acceptance of the updated policy.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Contact Us
                    </h2>
                    <div class="text-gray-300">
                        <p class="mb-4">
                            If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at:
                        </p>
                        <div class="bg-gray-700 rounded-lg p-4">
                            <p class="font-semibold mb-2">M&ms Pong Game Privacy Team</p>
                            <p>Email: privacy@ponggame.example</p>
                            <p>For general inquiries: support@ponggame.example</p>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-8">
                    <button id="backFromPrivacy" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg transition duration-300">
                        Back to Game
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners(): void {
        const backButton = document.getElementById('backFromPrivacy');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.history.back();
            });
        }
    }
}
