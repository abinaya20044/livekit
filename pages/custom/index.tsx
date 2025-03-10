'use client';
import { formatChatMessageLinks, LiveKitRoom, VideoConference } from '@livekit/components-react';
import {
  ExternalE2EEKeyProvider,
  LogLevel,
  Room,
  RoomConnectOptions,
  RoomOptions,
  VideoCodec,
  VideoPresets,
} from 'livekit-client';
import { useRouter } from 'next/router';
import { useMemo, useState, useEffect } from 'react';
import { decodePassphrase } from '../../lib/client-utils';
import { DebugMode } from '../../lib/Debug';
import FullScreenWhiteboard from '../components/fullScreenWhiteboard';
//import FullScreenWhiteboard from '../components/FullScreenWhiteboard';


export default function CustomRoomConnection() {
  const router = useRouter();
  const { liveKitUrl, token, codec } = router.query;
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const e2eePassphrase =
    typeof window !== 'undefined' && decodePassphrase(window.location.hash.substring(1));
  const worker =
    typeof window !== 'undefined' &&
    new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));
  const keyProvider = new ExternalE2EEKeyProvider();

  const e2eeEnabled = !!(e2eePassphrase && worker);

  const roomOptions = useMemo((): RoomOptions => {
    return {
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec: codec as VideoCodec | undefined,
      },
      adaptiveStream: { pixelDensity: 'screen' },
      dynacast: true,
      e2ee: e2eeEnabled
        ? {
            keyProvider,
            worker,
          }
        : undefined,
    };
  }, []);

  const room = useMemo(() => new Room(roomOptions), []);
  
  const connectOptions = useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  useEffect(() => {
    if (e2eeEnabled) {
      keyProvider.setKey(e2eePassphrase);
      room.setE2EEEnabled(true).catch((error) => {
        console.error('Error enabling E2EE:', error);
      });
    }
  }, [e2eeEnabled, e2eePassphrase, keyProvider, room]);

  if (typeof liveKitUrl !== 'string') {
    return <h2>Missing LiveKit URL</h2>;
  }
  if (typeof token !== 'string') {
    return <h2>Missing LiveKit token</h2>;
  }

  return (
    <main data-lk-theme="default">
      {liveKitUrl && (
        <LiveKitRoom
          room={room}
          token={token}
          connectOptions={connectOptions}
          serverUrl={liveKitUrl}
          audio={true}
          video={true}
        >
          {showWhiteboard ? (
            <FullScreenWhiteboard/>
          ) : (
            <VideoConference chatMessageFormatter={formatChatMessageLinks} />
          )}
          <div className="controls">
            <button onClick={() => setShowWhiteboard(!showWhiteboard)}>
              {showWhiteboard ? 'Back to Conference' : 'Show Whiteboard'}
            </button>
          </div>
          <DebugMode logLevel={LogLevel.debug} />
        </LiveKitRoom>
      )}
    </main>
  );
}