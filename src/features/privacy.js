/**
 * The privacy policy as a first-class screen.
 *
 * It is short because the app has no server: every claim below is a property
 * of the architecture rather than a promise about conduct, which is why the
 * page names what would have to change for it to stop being true.
 */
import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, workspace, groupHeading } from '../ui/components.js';
import { go } from '../core/router.js';

const KEPT_HERE = [
  ['screen', 'Stored on this device only', 'Your profile, workouts, sets, body measurements, progress photos, goals, and preferences are written to this browser\'s storage and stay there.'],
  ['shield', 'Never uploaded', 'GymLog has no account and no server. Nothing you log is sent anywhere, so there is no copy of it to leak, sell, or lose.'],
  ['info', 'Nothing is tracked', 'No analytics, no telemetry, no advertising, no error reporting, and no third-party scripts. No cookies are set.'],
  ['download', 'Yours to take or erase', 'Export everything as a JSON file whenever you want, and delete everything permanently in one action.'],
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
        workspace({
          iconName: 'shield',
          title: 'Your training stays yours',
          body: 'Body measurements, progress photos, and training history are personal. This is everything that happens to them.',
          content: el(
            'div',
            { class: 'privacy-layout' },
            el(
              'section',
              { class: 'surface-group' },
              groupHeading({ iconName: 'database', title: 'What GymLog keeps', body: 'All of it on this device, none of it anywhere else.' }),
              el('ul', { class: 'privacy-points' }, KEPT_HERE.map(point)),
            ),
            el(
              'section',
              { class: 'surface-group' },
              groupHeading({ iconName: 'info', title: 'What leaves this device', body: 'The honest answer, including the part GymLog does not control.' }),
              el(
                'p',
                { class: 'privacy-prose' },
                'Nothing you log. Loading the app does what loading any web page does: the host that delivers it records ordinary server access information, such as your IP address and the time of the request. GymLog adds nothing to those records and cannot read them.',
              ),
              el(
                'p',
                { class: 'privacy-prose' },
                'The browser storage GymLog uses is strictly necessary to run the app offline, so there is no consent banner to click through and nothing to opt out of.',
              ),
            ),
            el(
              'section',
              { class: 'surface-group' },
              groupHeading({ iconName: 'settings', title: 'What you control', body: 'No request to send, no one to ask.' }),
              el(
                'p',
                { class: 'privacy-prose' },
                'Export a full backup or permanently delete every record from this device, both from the data settings. Clearing this browser\'s site data removes the database too, and it cannot be recovered afterwards without an export.',
              ),
              el(
                'button',
                { type: 'button', class: 'settings-action is-accent mt-4', onClick: () => go('/settings') },
                icon('shield', 'w-4 h-4'),
                'Open data settings',
              ),
            ),
            el(
              'section',
              { class: 'surface-group' },
              groupHeading({ iconName: 'calendar', title: 'If this ever changes', body: 'What would have to happen first.' }),
              el(
                'p',
                { class: 'privacy-prose' },
                'Everything above holds because there is nowhere for the data to go. Adding accounts, cloud sync, analytics, or an app store release would change that, and none of them would ship without a published policy, a lawful basis for handling health data, and a working deletion path. Until then, this page is the whole story.',
              ),
            ),
          ),
        }),
      ),
    ),
  };
}

function point([iconName, title, body]) {
  return el(
    'li',
    { class: 'privacy-point' },
    el('span', { class: 'privacy-point__icon', 'aria-hidden': 'true' }, icon(iconName, 'w-[18px] h-[18px]')),
    el('div', { class: 'min-w-0' }, el('strong', null, title), el('span', null, body)),
  );
}
