// admin-settings.js – Settings & Theme
async function loadSettings() {
  const { data, error } = await supabaseClient.from('settings').select('*').limit(1).single();
  if (error) return;
  appSettings = data;
  getElement('settingAppName').value = data.app_name || '';
  getElement('settingLogoUrl').value = data.logo_url || '';
  getElement('settingSplashLogoUrl').value = data.splash_logo_url || '';
  getElement('settingGameIconUrl').value = data.game_icon_url || '';
  getElement('settingSignupBonus').value = data.signup_bonus || 10;
  getElement('settingReferralBonus').value = data.referral_bonus || 10;
  getElement('settingReferralPercent').value = data.referral_percent || 10;
  getElement('settingMinWithdraw').value = data.min_withdraw || 50;
  getElement('settingSupportContact').value = data.support_contact || '';
  getElement('settingDeveloperContact').value = data.developer_contact || '';
  getElement('settingUpiDetails').value = data.upi_details || '';
  getElement('settingQrCodeUrl').value = data.qr_code_url || '';
  getElement('settingTelegramLink').value = data.telegram_link || '';
  getElement('settingDiscordLink').value = data.discord_link || '';
  getElement('settingYoutubeLink').value = data.youtube_link || '';
  getElement('settingInstagramLink').value = data.instagram_link || '';
  getElement('settingReferralShareLink').value = data.referral_share_link || '';
  const appUpdate = data.app_update || {};
  getElement('settingIsUpdateAvailable').checked = appUpdate.isUpdateAvailable || false;
  getElement('settingAppVersion').value = appUpdate.appVersion || '';
  getElement('settingUpdateUrl').value = appUpdate.updateUrl || '';
  getElement('settingUpdateMessage').value = appUpdate.updateMessage || '';
  const ann = data.announcement_bar || {};
  getElement('settingEnableAnnouncementBar').checked = ann.isEnabled || false;
  getElement('settingAnnouncementText').value = ann.text || '';
  getElement('settingPolicyPrivacy').value = data.policy_privacy || '';
  getElement('settingPolicyTerms').value = data.policy_terms || '';
  getElement('settingPolicyRefund').value = data.policy_refund || '';
  getElement('settingPolicyFairPlay').value = data.policy_fair_play || '';
  applyThemeToAdminPanel(data.theme);
}

getElement('appSettingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const settingsData = {
    app_name: getElement('settingAppName').value.trim(),
    logo_url: getElement('settingLogoUrl').value.trim(),
    splash_logo_url: getElement('settingSplashLogoUrl').value.trim(),
    game_icon_url: getElement('settingGameIconUrl').value.trim(),
    signup_bonus: parseFloat(getElement('settingSignupBonus').value) || 10,
    referral_bonus: parseFloat(getElement('settingReferralBonus').value) || 10,
    referral_percent: parseFloat(getElement('settingReferralPercent').value) || 10,
    min_withdraw: parseFloat(getElement('settingMinWithdraw').value) || 50,
    support_contact: getElement('settingSupportContact').value.trim(),
    developer_contact: getElement('settingDeveloperContact').value.trim(),
    upi_details: getElement('settingUpiDetails').value.trim(),
    qr_code_url: getElement('settingQrCodeUrl').value.trim(),
    telegram_link: getElement('settingTelegramLink').value.trim(),
    discord_link: getElement('settingDiscordLink').value.trim(),
    youtube_link: getElement('settingYoutubeLink').value.trim(),
    instagram_link: getElement('settingInstagramLink').value.trim(),
    referral_share_link: getElement('settingReferralShareLink').value.trim(),
    app_update: {
      isUpdateAvailable: getElement('settingIsUpdateAvailable').checked,
      appVersion: getElement('settingAppVersion').value.trim(),
      updateUrl: getElement('settingUpdateUrl').value.trim(),
      updateMessage: getElement('settingUpdateMessage').value.trim()
    },
    announcement_bar: {
      isEnabled: getElement('settingEnableAnnouncementBar').checked,
      text: getElement('settingAnnouncementText').value.trim()
    },
    policy_privacy: getElement('settingPolicyPrivacy').value.trim(),
    policy_terms: getElement('settingPolicyTerms').value.trim(),
    policy_refund: getElement('settingPolicyRefund').value.trim(),
    policy_fair_play: getElement('settingPolicyFairPlay').value.trim(),
    last_updated: new Date()
  };
  showLoader(true);
  try {
    await supabaseClient.from('settings').update(settingsData).eq('id', appSettings.id);
    showStatus(getElement('settingsStatus'), 'Settings saved!', 'success', 3000);
    loadSettings();
    addLog('success', 'App settings updated');
  } catch (err) { showStatus(getElement('settingsStatus'), 'Error: ' + err.message, 'danger'); }
  finally { showLoader(false); }
});

// ----- THEME -----
function applyThemeToAdminPanel(theme) {
  if (!theme) return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) { if (value) root.style.setProperty(`--${key}`, value); }
}

function loadThemeSettings() {
  const theme = appSettings.theme || {};
  document.querySelectorAll('#themeSettingsForm input[type="color"]').forEach(input => {
    const varName = input.dataset.themeVar;
    input.value = theme[varName] || '';
  });
}

document.querySelectorAll('#themeSettingsForm input[type="color"]').forEach(input => {
  input.addEventListener('input', () => {
    const varName = input.dataset.themeVar;
    document.documentElement.style.setProperty(`--${varName}`, input.value);
  });
});

getElement('saveThemeBtn').addEventListener('click', async () => {
  const theme = {};
  document.querySelectorAll('#themeSettingsForm input[type="color"]').forEach(input => { theme[input.dataset.themeVar] = input.value; });
  showLoader(true);
  try {
    await supabaseClient.from('settings').update({ theme }).eq('id', appSettings.id);
    showStatus(getElement('themeStatus'), 'Theme saved!', 'success', 3000);
    loadSettings();
    addLog('success', 'Theme updated');
  } catch (err) { showStatus(getElement('themeStatus'), 'Error: ' + err.message, 'danger'); }
  finally { showLoader(false); }
});

getElement('resetThemeBtn').addEventListener('click', async () => {
  if (!confirm('Reset theme to default?')) return;
  showLoader(true);
  try {
    await supabaseClient.from('settings').update({ theme: null }).eq('id', appSettings.id);
    showStatus(getElement('themeStatus'), 'Theme reset!', 'success', 3000);
    loadSettings();
    addLog('info', 'Theme reset to default');
  } catch (err) { showStatus(getElement('themeStatus'), 'Error: ' + err.message, 'danger'); }
  finally { showLoader(false); }
});

getElement('presetBtnDefault').addEventListener('click', () => {
  const preset = { 'primary-bg': '#0F172A', 'secondary-bg': '#1E293B', 'card-bg': '#1E293B', 'text-primary': '#E2E8F0', 'text-secondary': '#94A3B8', 'accent-color': '#FACC15', 'primary-button-bg': '#3B82F6', 'border-color': '#334155', 'success-color': '#10B981', 'danger-color': '#EF4444', 'warning-color': '#F59E0B', 'info-color': '#60A5FA' };
  document.querySelectorAll('#themeSettingsForm input[type="color"]').forEach(input => { const val = preset[input.dataset.themeVar]; if (val) input.value = val; input.dispatchEvent(new Event('input')); });
});
getElement('presetBtnLight').addEventListener('click', () => {
  const preset = { 'primary-bg': '#F1F5F9', 'secondary-bg': '#FFFFFF', 'card-bg': '#FFFFFF', 'text-primary': '#0F172A', 'text-secondary': '#475569', 'accent-color': '#3B82F6', 'primary-button-bg': '#2563EB', 'border-color': '#CBD5E1', 'success-color': '#16A34A', 'danger-color': '#DC2626', 'warning-color': '#F59E0B', 'info-color': '#3B82F6' };
  document.querySelectorAll('#themeSettingsForm input[type="color"]').forEach(input => { const val = preset[input.dataset.themeVar]; if (val) input.value = val; input.dispatchEvent(new Event('input')); });
});
getElement('presetBtnGamingRed').addEventListener('click', () => {
  const preset = { 'primary-bg': '#111827', 'secondary-bg': '#1F2937', 'card-bg': '#1F2937', 'text-primary': '#F9FAFB', 'text-secondary': '#9CA3AF', 'accent-color': '#EF4444', 'primary-button-bg': '#D97706', 'border-color': '#374151', 'success-color': '#10B981', 'danger-color': '#EF4444', 'warning-color': '#F59E0B', 'info-color': '#3B82F6' };
  document.querySelectorAll('#themeSettingsForm input[type="color"]').forEach(input => { const val = preset[input.dataset.themeVar]; if (val) input.value = val; input.dispatchEvent(new Event('input')); });
});
