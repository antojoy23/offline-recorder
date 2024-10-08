'use client';

import { useState, useRef, useEffect } from "react";

export default function Home() {

  const [stream, setStream] = useState();
  const mediaRecorderRef = useRef();

  const getPermissions = async () => {
    let stream = null;

    const constraints = {
      audio: true,
      video: true
    }

    const mediaRecorderOptions = {
      mimeType: "video/mp4",
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaRecorderRef.current = new MediaRecorder(stream, mediaRecorderOptions);
      setStream(stream);
    } catch (err) {
      console.error(err);
    }
  }

  const startRecording = async () => {
    try {
      mediaRecorderRef.current.start(500);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    return () => {
      mediaRecorderRef.current = null;
    }
  }, [stream]);

  return (
    <>
      <h1>Offline recorder</h1>
      {!stream && <button onClick={getPermissions}>Get Permissions</button>}
      {stream && <button onClick={startRecording}>Record</button>}
    </>
  );
}
