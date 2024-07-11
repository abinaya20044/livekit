import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
  useToken,
  LocalUserChoices,
  PreJoin,
} from '@livekit/components-react';
import {
  DeviceUnsupportedError,
  ExternalE2EEKeyProvider,
  Room,
  RoomConnectOptions,
  RoomOptions,
  VideoCodec,
  VideoPresets,
  setLogLevel,
} from 'livekit-client';

import Head from 'next/head';
import * as React from 'react';
import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { DebugMode } from '../../lib/Debug';
import { SettingsMenu } from '../../lib/SettingsMenu';
import { decodePassphrase, useServerUrl } from '../../lib/client-utils';
import FullScreenWhiteboard from '../components/FullScreenWhiteboard';

const Home: NextPage = () => {
  const router = useRouter();
  const { name: roomName } = router.query;

  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined);
  const [isLocked, setIsLocked] = useState(false);

  const preJoinDefaults = React.useMemo(() => {
    return {
      username: '',
      videoEnabled: true,
      audioEnabled: true,
    };
  }, []);

  const handlePreJoinSubmit = React.useCallback(async (values: LocalUserChoices) => {
    try {
      const response = await fetch('../api/getLockStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: roomName }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lock status');
      }

      const data = await response.json();
      if (data.lockStatus) {
        setIsLocked(true);
        return;
      }

      setPreJoinChoices(values);
    } catch (error) {
      console.error('Error fetching lock status:', error);
    }
  }, [roomName]);

  const onPreJoinError = React.useCallback((e: any) => {
    console.error(e);
  }, []);

  const onLeave = React.useCallback(() => router.push('/'), []);

  if (isLocked) {
    alert('This meeting is currently locked. Please try again later.');
  }

  return (
    <>
      <Head>
        <title>LiveKit Meet</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main data-lk-theme="default">
        {roomName && !Array.isArray(roomName) && preJoinChoices ? (
          <ActiveRoom
            roomName={roomName}
            userChoices={preJoinChoices}
            onLeave={onLeave}
          ></ActiveRoom>
        ) : (
          <div className='grid items-center h-[100%]'>
            <PreJoin
              onError={onPreJoinError}
              defaults={preJoinDefaults}
              onSubmit={handlePreJoinSubmit}
            ></PreJoin>
          </div>
        )}
      </main>
    </>
  );
};

export default Home;

type ActiveRoomProps = {
  userChoices: LocalUserChoices;
  roomName: string;
  region?: string;
  onLeave?: () => void;
};

const ActiveRoom = ({ roomName, userChoices, onLeave }: ActiveRoomProps) => {
  const [isLocked, setIsLocked] = useState(false);
  const [roomExists, setRoomExists] = useState(true); 
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const fetchLockStatus = async () => {
    try {
      const response = await fetch('../api/getLockStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: roomName }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lock status');
      }

      const data = await response.json();
      setIsLocked(data.lockStatus);
      setRoomExists(true); 
    } catch (error) {
      console.error('Error fetching lock status:', error);
      setRoomExists(false); 
    }
  };

  useEffect(() => {
    fetchLockStatus();
    const intervalId = setInterval(fetchLockStatus, 1000); 
    return () => clearInterval(intervalId);
  }, [roomName]);

  const toggleLock = async () => {
    try {
      const response = await fetch('../api/toggleLock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: roomName, lock_status: !isLocked }),
      });

      if (!response.ok) {
        throw new Error('Failed to update lock status');
      }

      const data = await response.json();
      setIsLocked(data.lockStatus);
    } catch (error) {
      console.error('Error updating lock status:', error);
    }
  };

  const tokenOptions = React.useMemo(() => {
    return {
      userInfo: {
        identity: userChoices.username,
        name: userChoices.username,
      },
    };
  }, [userChoices.username]);
  const token = useToken(process.env.NEXT_PUBLIC_LK_TOKEN_ENDPOINT, roomName, tokenOptions);

  const router = useRouter();
  const { region, hq, codec } = router.query;

  const e2eePassphrase =
    typeof window !== 'undefined' && decodePassphrase(location.hash.substring(1));

  const liveKitUrl = useServerUrl(region as string | undefined);

  const worker =
    typeof window !== 'undefined' &&
    e2eePassphrase &&
    new Worker(new URL('livekit-client/e2ee-worker', import.meta.url));

  const e2eeEnabled = !!(e2eePassphrase && worker);
  const keyProvider = new ExternalE2EEKeyProvider();
  const roomOptions = React.useMemo((): RoomOptions => {
    let videoCodec: VideoCodec | undefined = (
      Array.isArray(codec) ? codec[0] : codec ?? 'vp9'
    ) as VideoCodec;
    if (e2eeEnabled && (videoCodec === 'av1' || videoCodec === 'vp9')) {
      videoCodec = undefined;
    }
    return {
      videoCaptureDefaults: {
        deviceId: userChoices.videoDeviceId ?? undefined,
        resolution: hq === 'true' ? VideoPresets.h2160 : VideoPresets.h720,
      },
      publishDefaults: {
        dtx: false,
        videoSimulcastLayers:
          hq === 'true'
            ? [VideoPresets.h1080, VideoPresets.h720]
            : [VideoPresets.h540, VideoPresets.h216],
        red: !e2eeEnabled,
        videoCodec,
      },
      audioCaptureDefaults: {
        deviceId: userChoices.audioDeviceId ?? undefined,
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
    // @ts-ignore
    setLogLevel('debug', 'lk-e2ee');
  }, [userChoices, hq, codec]);

  const room = React.useMemo(() => new Room(roomOptions), []);

  if (e2eeEnabled) {
    keyProvider.setKey(decodePassphrase(e2eePassphrase));
    room.setE2EEEnabled(true).catch((e) => {
      if (e instanceof DeviceUnsupportedError) {
        alert(
          `You're trying to join an encrypted meeting, but your browser does not support it. Please update it to the latest version and try again.`,
        );
        console.error(e);
      }
    });
  }
  const connectOptions = React.useMemo((): RoomConnectOptions => {
    return {
      autoSubscribe: true,
    };
  }, []);

  if (!roomExists) {
    alert('Room not found or error fetching room status.');
  }

  return (
    <>
      {liveKitUrl && (
        <LiveKitRoom
          room={room}
          token={token}
          serverUrl={liveKitUrl}
          connectOptions={connectOptions}
          video={userChoices.videoEnabled}
          audio={userChoices.audioEnabled}
          onDisconnected={onLeave}
        >
          {showWhiteboard ? (
            <div className='bg-white'>
              <p className='text-black font-bold text-xl flex justify-center items-center'>Whiteboard Placeholder</p>
              <FullScreenWhiteboard/>
            </div>
          ) : (
            <VideoConference
              chatMessageFormatter={formatChatMessageLinks}
              SettingsComponent={
                process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU === 'true' ? SettingsMenu : undefined
              }
            />
          )}
          <div className="controls">
            <button type="button" onClick={() => setShowWhiteboard(!showWhiteboard)} className="bg-[#1e1e1e] text-white items-center inline-block text-[16px] cursor-pointer rounded-lg hover:bg-[#303032]">
              {showWhiteboard ? 'Back to Conference' : 'Show Whiteboard'}
            </button>
          </div>
          <DebugMode />
          <button type='button' className="lk-button absolute top-[10px] right-[10px]" onClick={toggleLock}>
            {isLocked ? '🔒' : '🔓'}
          </button>
          <div className="absolute top-[50px] right-[10px]">
            {isLocked ? 'Room is locked' : 'Room is unlocked'}
          </div>
        </LiveKitRoom>
      )}
    </>
  );
};