/**
 * MomEase — Beta Feedback Form generator.
 *
 * How to run:
 *   1. Open https://script.google.com → New project.
 *   2. Paste this whole file into Code.gs, save.
 *   3. Run createMomEaseFeedbackForm() once. Approve the OAuth prompt
 *      (Forms + Drive + Sheets scopes).
 *   4. Check the execution log — it prints:
 *         FORM URL (public):  https://docs.google.com/forms/d/e/.../viewform
 *         EDIT URL:           https://docs.google.com/forms/d/.../edit
 *         SHEET URL:          https://docs.google.com/spreadsheets/d/.../edit
 *      Paste the FORM URL back into Claude to wire it into the app.
 *
 * The form is prefill-friendly: the app deep-links with
 *   ?entry.<id>=<value> so the platform / version / user email fields
 *   arrive pre-populated. After running, log the entry IDs (they are
 *   also written into the sheet header row).
 */

function createMomEaseFeedbackForm() {
  const form = FormApp.create('MomEase — Beta Feedback');
  form.setDescription(
    'Thanks for testing MomEase 💖\n\n' +
    'Your notes help us fix bugs, sharpen features, and make the app ' +
    'genuinely useful for busy moms. Nothing here is required — share ' +
    'as much or as little as you like.'
  )
    .setCollectEmail(false)
    .setAllowResponseEdits(true)
    .setShowLinkToRespondAgain(true)
    .setConfirmationMessage(
      'Got it — thank you 💜 We read every response and often reply within a day.'
    );

  // 1. Overall rating
  form.addScaleItem()
    .setTitle('How would you rate MomEase so far?')
    .setBounds(1, 5)
    .setLabels('Needs work', 'Love it');

  // 2. Feedback type
  form.addMultipleChoiceItem()
    .setTitle('What kind of feedback is this?')
    .setChoiceValues([
      '🐛 Bug — something is broken',
      '💡 Feature idea',
      '🎨 Design / UX suggestion',
      '❤️ Praise / kind words',
      '❓ Question',
      'Other',
    ]);

  // 3. Main feedback
  form.addParagraphTextItem()
    .setTitle('Tell us more')
    .setHelpText('What happened? What did you expect? Steps to reproduce if it\'s a bug.')
    .setRequired(true);

  // 4. Screen where it happened
  form.addMultipleChoiceItem()
    .setTitle('Where in the app?')
    .setChoiceValues([
      'Home',
      'Chat / Companion',
      'Tasks',
      'Sounds & Meditations',
      'Breathe',
      'Journal',
      'Profile / Settings',
      'Onboarding / Sign-up',
      'Upgrade / Billing',
      'Somewhere else',
    ]);

  // 5. Prefilled diagnostics (hidden-ish — pre-filled by the app)
  const platformItem = form.addTextItem()
    .setTitle('Platform')
    .setHelpText('Auto-filled by the app. Feel free to leave as-is.');

  const versionItem = form.addTextItem()
    .setTitle('App version')
    .setHelpText('Auto-filled by the app.');

  const emailItem = form.addTextItem()
    .setTitle('Your email (optional)')
    .setHelpText('Only if you want a reply. We will never share it.');

  // 6. Can we follow up
  form.addMultipleChoiceItem()
    .setTitle('OK to follow up if we have questions?')
    .setChoiceValues(['Yes, please', 'No thanks']);

  // Bind to a fresh spreadsheet
  const sheet = SpreadsheetApp.create('MomEase Feedback Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  const publicUrl = form.getPublishedUrl();
  const editUrl = form.getEditUrl();
  const sheetUrl = sheet.getUrl();

  // Prefill entry IDs — copy these to wire deep-links in the app
  const entryIds = {
    platform: platformItem.getId(),
    version: versionItem.getId(),
    email: emailItem.getId(),
  };

  Logger.log('=== MomEase Feedback Form ===');
  Logger.log('FORM URL (public):  ' + publicUrl);
  Logger.log('EDIT URL:           ' + editUrl);
  Logger.log('SHEET URL:          ' + sheetUrl);
  Logger.log('');
  Logger.log('Prefill entry IDs (append as ?entry.<id>=<value> to the form URL):');
  Logger.log('  platform: entry.' + entryIds.platform);
  Logger.log('  version:  entry.' + entryIds.version);
  Logger.log('  email:    entry.' + entryIds.email);

  return { publicUrl, editUrl, sheetUrl, entryIds };
}
