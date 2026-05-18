export const appConfig = {
  appName: "mesh-silence-counter",
  storagePrefix: "mesh-silence-counter",
  description:
    "Peer-to-peer mesh: group meditation timer. Phones detect stillness via accelerometer and aggregate the count anonymously.",
  accentHex: "#9c8cf5",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-silence-counter",
  pagesUrl: "https://baditaflorin.github.io/mesh-silence-counter/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
