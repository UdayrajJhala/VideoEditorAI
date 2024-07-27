// src/components/Timeline/TimelineItem.jsx

import React, { useEffect, useState, useRef } from "react";
import DualHandleSlider from "../../DualHandleSlider";
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import "./index.css";

const TimelineItem = ({ item, index, updateTimelineItem, isActive, onClick, deleteTimelineItem, shiftLeft, shiftRight }) => {
  const [frames, setFrames] = useState([]);
  const [videoDuration, setVideoDuration] = useState(1);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ffmpeg] = useState(() => new FFmpeg());
  const itemRef = useRef(null);

  useEffect(() => {
    const extractFrames = async (videoUrl) => {
      const video = document.createElement("video");
      video.src = videoUrl;

      // Wait for the video metadata to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      setVideoDuration(video.duration);
      setTrimEnd(video.duration);
      console.log("Video duration:", video.duration);

      await video.play();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const frames = [];

      video.pause();

      for (let time = 0; time < video.duration; time += video.duration / 8) {
        video.currentTime = time;
        await new Promise((resolve) => (video.onseeked = resolve));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg"));
      }

      setFrames(frames);
    };

    if (item.type.startsWith("video")) {
      extractFrames(item.url);
    }
  }, [item.url, item.type]);

  const handleTrimConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await ffmpeg.load({ coreURL, wasmURL });

      const data = await fetchFile(item.url);
      console.log("executed1")

      console.log("executed1.1")


      const trimDuration = trimEnd - trimStart;

      await ffmpeg.writeFile(item.name, new Uint8Array(data));
      console.log("executed1.2")
      await ffmpeg.exec([
        '-i', item.name,
        '-ss', trimStart.toFixed(2),
        '-t', trimDuration.toFixed(2),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-strict', 'experimental',
        'output.mp4'
      ]);
      console.log("executed2")


      const outputData = await ffmpeg.readFile('output.mp4');
      const videoBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      console.log(url)

      updateTimelineItem({ ...item, url, startTime: trimStart, duration: trimDuration });
    } catch (err) {
      setError('An error occurred while processing the video.');
      console.error('Processing error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    deleteTimelineItem(index);
  };

  return (
    <div
      ref={itemRef}
      className="timeline-item"
      style={{ left: `${item.startTime * 10}px` }}
      onClick={() => onClick(index)}
    >
      <div className="video-preview-container">
        <div className="video-item">
          {frames.map((frame, idx) => (
            <img
              key={idx}
              src={frame}
              alt={`frame-${idx}`}
              style={{ width: `${100 / frames.length}%` }}
            />
          ))}
        </div>
        {isActive && (
          <div className="trim-controls">
            <DualHandleSlider
              maxLimit={videoDuration}
              onChange={({ min, max }) => {
                setTrimStart(min);
                setTrimEnd(max);
              }}
            />
            <button onClick={handleTrimConfirm} disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Trim'}
            </button>
            <button onClick={handleDelete}>Delete</button>
            <button onClick={shiftLeft}>Shift Left</button>
            <button onClick={shiftRight}>Shift Right</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineItem;
