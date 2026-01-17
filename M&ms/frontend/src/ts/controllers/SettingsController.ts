// Settings controller for profile settings and 2FA

import { AuthService } from '../services/AuthService.js';
import { ProfileService } from '../services/ProfileService.js';

export class SettingsController {
    private authService: AuthService;
    private profileService: ProfileService;

    // DOM elements
    private avatarUpload: HTMLInputElement | null;
    private currentAvatar: HTMLElement | null;
    private toggle2faBtn: HTMLButtonElement | null;
    private twoFactorSetupModal: HTMLElement | null;
    private twoFactorSetupForm: HTMLFormElement | null;
    private setupTwoFactorError: HTMLElement | null;
    private qrCodeContainer: HTMLElement | null;

    // Callbacks
    private onShowSection: ((section: string) => void) | null = null;
    private onUpdatePlayerName: ((name: string) => void) | null = null;

    constructor() {
        this.authService = AuthService.getInstance();
        this.profileService = ProfileService.getInstance();

        this.avatarUpload = document.getElementById('avatarUpload') as HTMLInputElement;
        this.currentAvatar = document.getElementById('currentAvatar');
        this.toggle2faBtn = document.getElementById('toggle2faBtn') as HTMLButtonElement;
        this.twoFactorSetupModal = document.getElementById('twoFactorSetupModal');
        this.twoFactorSetupForm = document.getElementById('twoFactorSetupForm') as HTMLFormElement;
        this.setupTwoFactorError = document.getElementById('setupTwoFactorError');
        this.qrCodeContainer = document.getElementById('qrCodeContainer');
    }

    setCallbacks(
        onShowSection: (section: string) => void,
        onUpdatePlayerName: (name: string) => void
    ): void {
        this.onShowSection = onShowSection;
        this.onUpdatePlayerName = onUpdatePlayerName;
    }

    setupEventListeners(): void {
        this.avatarUpload?.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    alert('File size must be less than 2MB');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event: ProgressEvent<FileReader>) => {
                    if (event.target?.result && this.currentAvatar) {
                        this.currentAvatar.innerHTML = `<img src="${event.target.result}" class="w-24 h-24 rounded-full object-cover">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        this.toggle2faBtn?.addEventListener('click', async () => {
            if (this.toggle2faBtn?.textContent?.includes('Disable')) {
                if (confirm('Are you sure you want to disable 2FA?')) {
                    try {
                        await this.authService.disable2fa();
                        this.update2faButton(false);
                    } catch (e) {
                        alert('Failed to disable 2FA');
                    }
                }
            } else {
                try {
                    const data = await this.authService.generate2faSecret();
                    if (this.qrCodeContainer) {
                        this.qrCodeContainer.innerHTML = `<img src="${data.qrCode}" alt="2FA QR Code" class="mx-auto" />`;
                    }
                    this.twoFactorSetupModal?.classList.remove('hidden');
                } catch (e) {
                    alert('Failed to start 2FA setup');
                }
            }
        });

        document.getElementById('close2faSetup')?.addEventListener('click', () => {
            this.twoFactorSetupModal?.classList.add('hidden');
        });

        this.twoFactorSetupForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.setupTwoFactorError?.classList.add('hidden');
            const input = document.getElementById('setupTwoFactorCode') as HTMLInputElement;
            const code = input.value;
            try {
                await this.authService.enable2fa(code);
                this.twoFactorSetupModal?.classList.add('hidden');
                this.update2faButton(true);
                alert('Two-Factor Authentication Enabled!');
            } catch (e) {
                if (this.setupTwoFactorError) {
                    this.setupTwoFactorError.textContent = 'Invalid code';
                    this.setupTwoFactorError.classList.remove('hidden');
                }
            }
        });

        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            await this.saveSettings();
        });

        document.getElementById('cancelSettingsBtn')?.addEventListener('click', () => {
            this.onShowSection?.('game');
        });
    }

    private async saveSettings(): Promise<void> {
        const user = this.authService.getCurrentUser();
        if (!user) {
            alert('You must be logged in to save settings');
            return;
        }

        const saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;

        const settings = {
            display_name: (document.getElementById('settingsUsername') as HTMLInputElement).value,
            date_of_birth: (document.getElementById('settingsDOB') as HTMLInputElement).value || undefined,
            nationality: (document.getElementById('settingsNationality') as HTMLSelectElement).value || undefined,
            phone: (document.getElementById('settingsPhone') as HTMLInputElement).value || undefined,
            gender: (document.getElementById('settingsGender') as HTMLSelectElement).value || undefined
        };

        try {
            if (saveSettingsBtn) {
                saveSettingsBtn.disabled = true;
                saveSettingsBtn.textContent = 'Saving...';
            }

            await this.profileService.updateProfile(user.id, settings);

            if (settings.display_name) {
                this.onUpdatePlayerName?.(settings.display_name);
            }

            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        } finally {
            if (saveSettingsBtn) {
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.textContent = 'Save Changes';
            }
        }
    }

    async loadSettingsData(): Promise<void> {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        try {
            const profile = await this.profileService.fetchUserProfile(user.id);

            const settingsUsername = document.getElementById('settingsUsername') as HTMLInputElement;
            const settingsEmail = document.getElementById('settingsEmail') as HTMLInputElement;
            const settingsDOB = document.getElementById('settingsDOB') as HTMLInputElement;
            const settingsNationality = document.getElementById('settingsNationality') as HTMLSelectElement;
            const settingsPhone = document.getElementById('settingsPhone') as HTMLInputElement;
            const settingsGender = document.getElementById('settingsGender') as HTMLSelectElement;

            if (settingsUsername) settingsUsername.value = profile.display_name || profile.username;
            if (settingsEmail) settingsEmail.value = user.email;
            if (settingsDOB && profile.date_of_birth) settingsDOB.value = profile.date_of_birth;
            if (settingsNationality && profile.nationality) settingsNationality.value = profile.nationality;
            if (settingsPhone && profile.phone) settingsPhone.value = profile.phone;
            if (settingsGender && profile.gender) settingsGender.value = profile.gender;

            if (profile.avatar_url && this.currentAvatar) {
                this.currentAvatar.innerHTML = `<img src="${profile.avatar_url}" class="w-24 h-24 rounded-full object-cover">`;
            }
        } catch (error) {
            console.error('Failed to load settings data:', error);
        }
    }

    async check2faStatus(): Promise<void> {
        try {
            const status = await this.authService.get2faStatus();
            this.update2faButton(status.enabled);
        } catch (e) {
            console.error(e);
        }
    }

    update2faButton(enabled: boolean): void {
        if (!this.toggle2faBtn) return;

        if (enabled) {
            this.toggle2faBtn.textContent = 'Disable 2FA';
            this.toggle2faBtn.classList.replace('bg-indigo-600', 'bg-red-600');
            this.toggle2faBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-red-700');
        } else {
            this.toggle2faBtn.textContent = 'Enable 2FA';
            this.toggle2faBtn.classList.replace('bg-red-600', 'bg-indigo-600');
            this.toggle2faBtn.classList.replace('hover:bg-red-700', 'hover:bg-indigo-700');
        }
    }
}
