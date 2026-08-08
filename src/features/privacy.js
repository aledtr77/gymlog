/**
 * The privacy policy, as a document and nothing else.
 *
 * No controls, no links out: someone reading this wants to know what happens
 * to their data, not to be sent somewhere. It is short because the app has no
 * server, so every claim is a property of the architecture rather than a
 * promise about conduct, which is why the last section names what would have
 * to change for any of it to stop being true.
 */
import { el } from '../ui/el.js';
import { appbar } from '../ui/components.js';
import { go } from '../core/router.js';

const LEAD = 'GymLog records body measurements, progress photos, and training history. That is personal information, so here is the whole story of what happens to it.';

const SECTIONS = [
  ['What is stored, and where', [
    'Your profile, workouts, sets, body measurements, progress photos, goals, and preferences are written to this browser\'s storage, on this device.',
    'Nothing else holds a copy. There is no account, no server, and no cloud backup behind the app.',
  ]],
  ['What is never sent', [
    'Nothing you log is uploaded anywhere, so there is no copy of it to leak, sell, or lose.',
    'GymLog contains no analytics, no telemetry, no advertising, no error reporting, and no third-party scripts. It sets no cookies.',
  ]],
  ['What leaves this device', [
    'None of your training data. Loading the app does what loading any web page does: the host that delivers it records ordinary server access information, such as your IP address and the time of the request. GymLog adds nothing to those records and cannot read them.',
    'The browser storage the app uses is strictly necessary to run it offline, so there is no consent banner to click through and nothing to opt out of.',
  ]],
  ['What you can do with it', [
    'You can export everything as a JSON file, and you can delete every record permanently, both from the data settings. Neither needs a request, an account, or anyone\'s permission.',
    'Clearing this browser\'s site data also removes the database. After that it cannot be recovered without an export you made earlier.',
  ]],
  ['If this ever changes', [
    'Everything above holds because there is nowhere for the data to go. Accounts, cloud sync, analytics, or a release through an app store would change that.',
    'None of them would ship without a published policy, a lawful basis for handling health data, and a working deletion path. Until then, this page is complete.',
  ]],
];

export function render() {
  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Privacy', heading: 'What happens to your data', back: () => go('/more') }),
      el(
        'main',
        { class: 'screen privacy-screen' },
        el(
          'article',
          { class: 'privacy-doc' },
          el('p', { class: 'privacy-doc__lead' }, LEAD),
          SECTIONS.map(([title, paragraphs]) => [
            el('h2', null, title),
            paragraphs.map((text) => el('p', null, text)),
          ]),
        ),
      ),
    ),
  };
}
