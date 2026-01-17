// Terms of Service page component

export class TermsOfServicePage {
    private container: HTMLElement | null;

    constructor() {
        this.container = document.getElementById('termsOfServiceSection');
        this.render();
    }

    private render(): void {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="max-w-4xl mx-auto py-8 px-4">
                <h1 class="text-4xl font-bold text-white mb-8">Terms of Service</h1>
                
                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <p class="text-gray-300 mb-6">
                        Last updated: January 17, 2026
                    </p>
                    <p class="text-gray-300 mb-6">
                        Welcome to M&ms Pong Game. These Terms of Service ("Terms") govern your access to and use of our online multiplayer pong gaming platform. By accessing or using our service, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our service.
                    </p>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Acceptance of Terms
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>By creating an account or using M&ms Pong Game, you:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li>Confirm that you are at least 13 years of age</li>
                            <li>Agree to comply with all applicable laws and regulations</li>
                            <li>Accept these Terms and our Privacy Policy</li>
                            <li>Acknowledge that we may update these Terms at any time</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Account Registration and Security
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <h3 class="text-lg font-semibold text-white mb-2">Account Creation</h3>
                        <p>To access certain features, you must register for an account by providing:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>A unique username</li>
                            <li>A valid email address</li>
                            <li>A secure password</li>
                            <li>Or use OAuth authentication via Google</li>
                        </ul>

                        <h3 class="text-lg font-semibold text-white mb-2 mt-4">Account Responsibilities</h3>
                        <p>You are responsible for:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li>Maintaining the confidentiality of your login credentials</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized access</li>
                            <li>Ensuring your account information is accurate and up to date</li>
                            <li>Not sharing your account with others</li>
                        </ul>

                        <h3 class="text-lg font-semibold text-white mb-2 mt-4">Two-Factor Authentication</h3>
                        <p>
                            We strongly recommend enabling two-factor authentication (2FA) for enhanced account security. Once enabled, you will need both your password and a time-based code from your authenticator app to log in.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Acceptable Use Policy
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>You agree NOT to:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Cheat or Exploit:</strong> Use hacks, bots, cheats, exploits, or any unauthorized third-party software</li>
                            <li><strong>Harassment:</strong> Harass, bully, threaten, or abuse other users through chat or gameplay</li>
                            <li><strong>Impersonation:</strong> Impersonate other users, staff members, or public figures</li>
                            <li><strong>Inappropriate Content:</strong> Share offensive, obscene, hateful, violent, or illegal content</li>
                            <li><strong>Spam:</strong> Send unsolicited messages, advertisements, or repetitive content</li>
                            <li><strong>Unauthorized Access:</strong> Attempt to access other users' accounts or our systems without authorization</li>
                            <li><strong>System Interference:</strong> Disrupt, overload, or interfere with our servers or networks</li>
                            <li><strong>Data Scraping:</strong> Use automated tools to collect data from our service without permission</li>
                            <li><strong>Reverse Engineering:</strong> Decompile, reverse engineer, or attempt to extract source code</li>
                            <li><strong>Account Selling:</strong> Sell, trade, or transfer your account to others</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Game Services and Features
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <h3 class="text-lg font-semibold text-white mb-2">Available Features</h3>
                        <p>Our service provides:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Multiplayer Games:</strong> Real-time pong matches against other players</li>
                            <li><strong>AI Mode:</strong> Practice against AI opponents with adjustable difficulty</li>
                            <li><strong>Tournaments:</strong> Participate in bracket-style competitive tournaments</li>
                            <li><strong>Leaderboards:</strong> Track rankings and compete for top positions</li>
                            <li><strong>Chat System:</strong> Communicate with friends and other players</li>
                            <li><strong>AI Assistant:</strong> Get help and information using our AI-powered assistant</li>
                            <li><strong>Profile Management:</strong> Customize your profile, avatar, and settings</li>
                            <li><strong>Friend System:</strong> Add friends and view their profiles</li>
                            <li><strong>Match History:</strong> Review your past games and statistics</li>
                        </ul>

                        <h3 class="text-lg font-semibold text-white mb-2 mt-4">Game Rules</h3>
                        <p>All players must:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Play fairly and respect opponents</li>
                            <li>Complete matches or forfeit properly (leaving mid-match may result in penalties)</li>
                            <li>Accept the outcome of matches as determined by the game system</li>
                            <li>Report bugs or exploits instead of abusing them</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        User Content and Communications
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <h3 class="text-lg font-semibold text-white mb-2">Chat and Messaging</h3>
                        <p>When using our chat features:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li>Be respectful and courteous to all users</li>
                            <li>Do not share personal contact information publicly</li>
                            <li>Report inappropriate behavior using our reporting tools</li>
                            <li>Understand that chat messages may be logged for moderation purposes</li>
                        </ul>

                        <h3 class="text-lg font-semibold text-white mb-2 mt-4">User-Generated Content</h3>
                        <p>By submitting content (profile information, avatars, messages):</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li>You confirm you have the right to share that content</li>
                            <li>You grant us a license to use, display, and store that content</li>
                            <li>You acknowledge we may remove content that violates these Terms</li>
                            <li>You remain responsible for all content you submit</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Intellectual Property
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>All content and materials on M&ms Pong Game, including but not limited to:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Game design, graphics, and sound effects</li>
                            <li>Software code and architecture</li>
                            <li>Text, logos, and trademarks</li>
                            <li>UI/UX design and layout</li>
                        </ul>
                        <p class="mt-4">
                            ...are owned by or licensed to us and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Service Availability
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>While we strive to provide reliable service:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>No Guarantee:</strong> We do not guarantee uninterrupted or error-free service</li>
                            <li><strong>Maintenance:</strong> Service may be temporarily unavailable during scheduled or emergency maintenance</li>
                            <li><strong>Updates:</strong> We may update, modify, or discontinue features at any time without notice</li>
                            <li><strong>Beta Features:</strong> Some features may be marked as experimental and subject to change</li>
                            <li><strong>Regional Availability:</strong> Service availability may vary by region</li>
                        </ul>
                        <p class="mt-4">
                            We will make reasonable efforts to notify users of planned maintenance when possible.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Account Termination and Suspension
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <h3 class="text-lg font-semibold text-white mb-2">Termination by You</h3>
                        <p>You may delete your account at any time through your account settings. Upon deletion:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Your personal data will be deleted within 30 days</li>
                            <li>Your game statistics may be retained in anonymized form</li>
                            <li>You will lose access to all features and content</li>
                        </ul>

                        <h3 class="text-lg font-semibold text-white mb-2 mt-4">Termination by Us</h3>
                        <p>We reserve the right to suspend or terminate your account if:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li>You violate these Terms of Service</li>
                            <li>You engage in cheating, harassment, or abusive behavior</li>
                            <li>Your account is used for fraudulent or illegal activities</li>
                            <li>We are required to do so by law</li>
                            <li>You have been inactive for an extended period</li>
                        </ul>

                        <h3 class="text-lg font-semibold text-white mb-2 mt-4">Suspension Policy</h3>
                        <p>Violations may result in:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li><strong>First offense:</strong> Warning or temporary suspension (1-7 days)</li>
                            <li><strong>Second offense:</strong> Longer suspension (7-30 days)</li>
                            <li><strong>Severe or repeated violations:</strong> Permanent ban</li>
                        </ul>
                        <p class="mt-4">
                            Severe violations (hacking, threats, illegal content) may result in immediate permanent ban without warning.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Disclaimer of Warranties
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p class="uppercase font-semibold">
                            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                        </p>
                        <p>We disclaim all warranties, including but not limited to:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Merchantability, fitness for a particular purpose, and non-infringement</li>
                            <li>Uninterrupted, secure, or error-free operation</li>
                            <li>Accuracy, reliability, or completeness of content</li>
                            <li>Correction of defects or errors</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Limitation of Liability
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p class="uppercase font-semibold">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
                        </p>
                        <p>This includes, but is not limited to, damages for:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Loss of profits, data, use, or goodwill</li>
                            <li>Service interruptions or unavailability</li>
                            <li>Unauthorized access to your account</li>
                            <li>Errors or omissions in content</li>
                            <li>Any third-party conduct or content</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        Dispute Resolution
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <p>If you have a dispute with us:</p>
                        <ul class="list-disc pl-6 mt-2 space-y-2">
                            <li><strong>Contact Us First:</strong> Please contact our support team to resolve issues informally</li>
                            <li><strong>Informal Resolution:</strong> We will work with you in good faith to resolve disputes</li>
                            <li><strong>Governing Law:</strong> These Terms are governed by applicable local laws</li>
                            <li><strong>Venue:</strong> Any legal action must be brought in appropriate courts</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Changes to Terms
                    </h2>
                    <div class="text-gray-300">
                        <p>
                            We may update these Terms from time to time. We will notify users of material changes by:
                        </p>
                        <ul class="list-disc pl-6 mt-2 space-y-1">
                            <li>Posting the updated Terms on this page</li>
                            <li>Updating the "Last updated" date</li>
                            <li>Sending an email notification for significant changes</li>
                        </ul>
                        <p class="mt-4">
                            Your continued use of the service after changes take effect constitutes acceptance of the updated Terms.
                        </p>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        General Provisions
                    </h2>
                    <div class="text-gray-300 space-y-4">
                        <ul class="list-disc pl-6 space-y-2">
                            <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and us</li>
                            <li><strong>Severability:</strong> If any provision is found unenforceable, the rest remains in effect</li>
                            <li><strong>No Waiver:</strong> Our failure to enforce any right or provision is not a waiver</li>
                            <li><strong>Assignment:</strong> You may not assign these Terms; we may assign them without restriction</li>
                            <li><strong>Third-Party Services:</strong> We are not responsible for third-party services (Google OAuth, etc.)</li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 flex items-center">
                        <svg class="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Contact Information
                    </h2>
                    <div class="text-gray-300">
                        <p class="mb-4">
                            If you have questions about these Terms or need to report a violation, please contact us at:
                        </p>
                        <div class="bg-gray-700 rounded-lg p-4">
                            <p class="font-semibold mb-2">M&ms Pong Game Support Team</p>
                            <p>Email: support@ponggame.example</p>
                            <p>Legal inquiries: legal@ponggame.example</p>
                            <p>Abuse reports: abuse@ponggame.example</p>
                        </div>
                    </div>
                </div>

                <div class="bg-indigo-900 bg-opacity-50 rounded-lg p-6 mb-6 border border-indigo-500">
                    <p class="text-gray-300 text-center">
                        <strong class="text-white">By using M&ms Pong Game, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</strong>
                    </p>
                </div>

                <div class="text-center mt-8">
                    <button id="backFromTerms" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-lg transition duration-300">
                        Back to Game
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners(): void {
        const backButton = document.getElementById('backFromTerms');
        if (backButton) {
            backButton.addEventListener('click', () => {
                window.history.back();
            });
        }
    }
}
