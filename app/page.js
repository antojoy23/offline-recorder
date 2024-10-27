'use client';

import { useState, useRef, useCallback, useEffect } from "react";

import classes from './page.module.css';

const displayMediaOptions = {
  video: {
    width: { ideal: 1980 },
    height: { ideal: 1080 },
    displaySurface: "monitor",
    frameRate: 30
  },
  audio: { echoCancellation: true, sampleRate: 44100 },
  preferCurrentTab: false,
  selfBrowserSurface: "exclude",
  systemAudio: "include",
  surfaceSwitching: "include",
  monitorTypeSurfaces: "include",
};

export default function Home() {

  const [audioDevices, setAudioDevices] = useState();
  const [recordingInProgress, setRecordingInProgress] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const streamRef = useRef();
  const audioStreamRef = useRef();
  const mergedStreams = useRef();

  const audioDevice = useRef();

  const mediaRecorderRef = useRef();
  const chunksRef = useRef();

  const videoElementRef = useRef();
  const videoUrl = useRef();

  const mergeAudioStreams = useCallback((desktopStream, voiceStream) => {
    const context = new AudioContext();

    // Create a couple of sources
    try {
      const source1 = context.createMediaStreamSource(desktopStream);
      const source2 = context.createMediaStreamSource(voiceStream);
      const destination = context.createMediaStreamDestination();

      const desktopGain = context.createGain();
      const voiceGain = context.createGain();

      desktopGain.gain.value = 0.8;
      voiceGain.gain.value = 1;

      source1.connect(desktopGain).connect(destination);
      // Connect source2
      source2.connect(voiceGain).connect(destination);

      return destination.stream.getAudioTracks();
    } catch (ex) {
      stopStreams();
      if (ex.message.includes("no audio track")) {
        alert("Did not select the share audio option while screen share?")
      }
      console.error(ex);
    }
  }, []);

  const fetchDevices = async () => {
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    setAudioDevices(mediaDevices.filter(device => device.kind === "audioinput"));
  }

  const getPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      fetchDevices();
    } catch (ex) {
      console.error(ex);
      alert("Error: ", ex.name);
    }
  }


  const getDeviceId = (deviceId) => {
    let newDeviceId = deviceId;
    if (deviceId === "default" || deviceId === "communications") {
      const currentDevice = audioDevices.find(device => device.deviceId === deviceId);
      newDeviceId = audioDevices.filter(device => currentDevice.label.includes(device.label) && device.deviceId !== "default" && device.deviceId !== "communications")[0].deviceId;
    }

    return newDeviceId;
  }

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      if (videoElementRef.current && videoElementRef.current.src) videoElementRef.current.src = null;
      videoUrl.current = null;
      streamRef.current = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      let audioOptions = {
        echoCancellation: true, sampleRate: 44100
      }
      if (audioDevice.current) {
        audioOptions.deviceId = getDeviceId(audioDevice.current);
      }
      audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: audioOptions });

      const mergedTracks = [
        ...streamRef.current.getVideoTracks(),
        ...mergeAudioStreams(streamRef.current, audioStreamRef.current)
      ];

      mergedStreams.current = new MediaStream(mergedTracks);

      mediaRecorderRef.current = new MediaRecorder(mergedStreams.current, displayMediaOptions);

      mediaRecorderRef.current.onstart = () => {
        console.log("Recording Started");
      }

      mediaRecorderRef.current.onstop = (e) => {
        const screenBlob = new Blob(chunksRef.current, { type: "video/webm; codecs=vp8,opus" });
        videoUrl.current = URL.createObjectURL(screenBlob);

        setShowVideo(true);
      }

      const tracks = streamRef.current.getVideoTracks();
      tracks[0].onended = () => {
        stopRecording();
      }

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      }
      mediaRecorderRef.current.start(500);
      setRecordingInProgress(true);
      setShowVideo(false);
    } catch (err) {
      console.error(err);
    }
  }

  const stopStreams = () => {
    try {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      const audioTracks = audioStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.stop();
      })
      const mergedTracks = mergedStreams.current.getTracks();
      mergedTracks.forEach(track => {
        track.stop();
      })
    } catch (ex) { }
  }

  const stopRecording = async () => {
    try {
      mediaRecorderRef.current.stop();
      stopStreams();
      setRecordingInProgress(false);
    } catch (err) {
      console.error(err);
    }
  }

  const onAudioDeviceChange = (e) => {
    audioDevice.current = e.target.value;
  }

  const showPermissionsButton = audioDevices && audioDevices[0].deviceId === '';

  useEffect(() => {
    fetchDevices();
  }, [])

  useEffect(() => {
    if (showVideo) {
      videoElementRef.current.controls = true;
      videoElementRef.current.src = videoUrl.current;
    }
  }, [showVideo])

  if (!audioDevices) return null;

  return (
    <main className={classes.main}>
      <h1>Offline recorder</h1>
      <section className={classes.optionsPanel}>
        {showPermissionsButton && <button className={classes.button} onClick={getPermission}>Get Permissions</button>}
        {!showPermissionsButton &&
          <>
            {!recordingInProgress &&
              <div className={classes.micOptions}>
                <label className={classes.micOptionsLabel}>Current Mic:</label>
                <div className={classes.select}>
                  <select className={classes.customSelect} onChange={onAudioDeviceChange}>
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            }
            {
              recordingInProgress && <div>Recording in progess...</div>
            }
            {!recordingInProgress && <button className={classes.button} onClick={startRecording}>Record</button>}
            {recordingInProgress && <button className={`${classes.button} ${classes.stopButton}`} onClick={stopRecording}>Stop Recording</button>}
          </>
        }
      </section>
      {showVideo && <section className={classes.videoSection}>
        <div className={classes.videoContainer}>
          <span>Playback</span>
          <video className={classes.video} ref={videoElementRef}></video>
        </div>
      </section>}
    </main>
  );
}
