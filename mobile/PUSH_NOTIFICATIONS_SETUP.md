# Push notifications — Android and iOS activation

The application code is already complete for both platforms. It requests permission only after
an explicit user action, obtains an Expo push token, registers it with `POST /api/devices`, opens
the matching alert when a notification is tapped, removes registrations when a user opts out,
and retries token rotation safely. The backend dispatches eligible new alerts every five minutes
and checks Expo delivery receipts.

What remains is account and credential setup. Credentials are intentionally not committed.

## Cost reality

| Part | Cost | Constraint |
| --- | --- | --- |
| Expo Push Service | No charge | 600 notifications/second/project limit |
| Firebase Cloud Messaging | No charge | Firebase project and FCM V1 credentials required |
| Apple Push Notification service | No per-message charge | Production credentials require Apple Developer Program membership |
| Apple Developer Program | US$99/year or local equivalent | Already required to distribute the iOS app; push adds no extra fee |
| EAS cloud builds | Optional | Keep using local Xcode and Gradle builds to avoid cloud-build charges |
| Existing Render web service | Free-plan eligible | Sleeps after 15 idle minutes; no production SLA |
| Existing Supabase database | Free within quota | Monitor the 500 MB database and 5 GB egress limits |
| cron-job.org health request | No charge | Best-effort external service; enable failure emails |

Therefore Android push can have zero service cost. iOS push has zero additional messaging cost,
but it cannot be called completely free because Apple requires the paid developer membership to
issue production push credentials and distribute the app.

Official references:

- [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo push pricing and limits](https://docs.expo.dev/push-notifications/faq/)
- [Expo FCM V1 credentials](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Firebase pricing](https://firebase.google.com/pricing)
- [Apple Developer Program membership](https://developer.apple.com/programs/whats-included/)
- [Render free-service limits](https://render.com/docs/free)

## 1. Link the app to an Expo project

Use the Expo account that will own production credentials:

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Record the resulting project UUID. Add it to `mobile/.env` for local Xcode/Gradle builds:

```dotenv
EAS_PROJECT_ID=00000000-0000-0000-0000-000000000000
```

Also add the same non-secret value as `EAS_PROJECT_ID` in the preview and production EAS
environments if EAS Build is ever used. `app.config.ts` publishes it as
`extra.eas.projectId`; the client deliberately refuses notification registration when it is
missing.

Verify the production config before building:

```bash
APP_VARIANT=production npx expo config --type public
```

The output must contain `extra.eas.projectId`, `ios.bundleIdentifier: in.pahadpulse.app`, and
`android.package: in.pahadpulse.app`.

## 2. Configure Android delivery with Firebase

1. Create a Firebase project on the no-cost Spark plan.
2. Add an Android application with package name `in.pahadpulse.app`.
3. Download its `google-services.json` to `mobile/google-services.json`.
4. Add this property to the existing `android` object in `mobile/app.config.ts`:

   ```ts
   googleServicesFile: './google-services.json',
   ```

5. In Firebase, open **Project settings → Service accounts**, generate a private key, and save
   it outside this repository. This service-account JSON is secret and must never be committed.
6. Upload that private key to Expo:

   ```bash
   cd mobile
   npx eas-cli@latest credentials --platform android
   ```

   Select the production profile, then **Google Service Account → Manage your Google Service
   Account Key for Push Notifications (FCM V1) → Upload a new service account key**.

`google-services.json` contains the public Android project configuration and may be committed;
the service-account private key must not be. If preview builds using
`in.pahadpulse.app.preview` also need push, register that package as a second Firebase Android
app and select its matching file at build time. Never use a file whose package name differs
from the built application ID.

## 3. Configure iOS delivery with APNs

The existing `expo-notifications` config plugin adds the Push Notifications entitlement during
prebuild. Do not add it manually in the generated Xcode project.

```bash
cd mobile
npx eas-cli@latest credentials --platform ios
```

1. Select the production bundle ID `in.pahadpulse.app`.
2. Select **Push Notifications** / **APNs key**.
3. Generate a new key or upload the team's existing `.p8` key.
4. Confirm the App ID has the Push Notifications capability.
5. Refresh the provisioning profile if it predates that capability.

An APNs key is team-wide and should be stored securely. Revoking it stops delivery for every
app that uses it. A paid Apple Developer account is required for this step.

## 4. Protect the Expo relay and activate the backend

In the EAS dashboard for the project, enable enhanced push security and create an access token.
Store it only in **Render → pahadpulse-api → Environment**:

```dotenv
EXPO_ACCESS_TOKEN=<the-project-access-token>
```

The backend already sends the matching `Authorization: Bearer ...` header. `render.yaml` already
sets `SCHEDULER_ENABLED=true`, and each Render deploy runs the database migrations, including
`device_tokens` and `push_notification_tickets`. Redeploy the API after adding the token.

Because a free Render web service sleeps after 15 minutes without inbound traffic, configure a
free cron-job.org request to:

```text
https://pahadpulse.onrender.com/health
```

Run it every 10 minutes and enable failure/recovery emails. This keeps the in-process five-minute
notification job running on the current hobby setup, but it is best-effort rather than a
production uptime guarantee.

## 5. Rebuild both native apps

Push credentials and native entitlements are build-time configuration. Existing installed
builds do not gain push support remotely.

```bash
cd mobile

APP_VARIANT=production \
EXPO_PUBLIC_API_URL=https://pahadpulse.onrender.com/api \
EXPO_PUBLIC_WEB_URL=https://www.pahadpulse.live \
npx expo prebuild --clean
```

Then create a fresh signed Android release with Gradle and a fresh iOS archive with Xcode. Do
not test remote push in Expo Go; current Expo SDKs require a development or standalone build.

## 6. End-to-end verification

Use physical Android and iPhone devices with the newly built apps:

1. Open **More → Settings** and turn on warning notifications.
2. Accept the operating-system permission prompt.
3. Confirm the API registered both platforms:

   ```sql
   SELECT platform, language, disabled_at, updated_at
   FROM device_tokens
   ORDER BY updated_at DESC;
   ```

4. Send one harmless display test through Expo using each token. If enhanced security is on,
   include `Authorization: Bearer <EXPO_ACCESS_TOKEN>`.
5. Confirm delivery while the app is foregrounded, backgrounded, and terminated.
6. Tap a real alert notification and confirm it opens `/alerts/<id>`.
7. Turn notifications off in app settings and confirm the token row is deleted.
8. Check Render logs for `alert notifications dispatched` and, after at least 15 minutes,
   `push receipts reconciled`.

If Android reports `MismatchSenderId`, the FCM service-account key and `google-services.json`
come from different Firebase projects. If iOS reports `InvalidCredentials`, replace the APNs
key in EAS and rebuild with a provisioning profile that includes Push Notifications.
