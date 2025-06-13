import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Slider } from '../ui/slider';
import { 
  PlayIcon, 
  PauseIcon, 
  VolumeIcon, 
  Volume2Icon,
  VolumeXIcon,
  MaximizeIcon,
  MinimizeIcon,
  BrainIcon,
  MessageSquareIcon,
  CaptionsIcon,
  SkipBackIcon,
  SkipForwardIcon,
  RotateCcwIcon
} from 'lucide-react';

interface VideoPreviewPanelProps {
  fileData: any;
  previewUrl: string;
  onAIAnnotation: (type: string, options?: any) => void;
}

interface TimeRange {
  start: number;
  end: number;
}

export const VideoPreviewPanel: React.FC<VideoPreviewPanelProps> = ({
  fileData,
  previewUrl,
  onAIAnnotation
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const progress = progressRef.current;
    const video = videoRef.current;
    if (!progress || !video) return;

    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    if (isSelectingRange) {
      if (rangeStart === null) {
        setRangeStart(newTime);
      } else {
        setSelectedTimeRange({
          start: Math.min(rangeStart, newTime),
          end: Math.max(rangeStart, newTime)
        });
        setIsSelectingRange(false);
        setRangeStart(null);
      }
    } else {
      video.currentTime = newTime;
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const volumeValue = newVolume[0];
    setVolume(volumeValue);
    video.volume = volumeValue;
    setIsMuted(volumeValue === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  const handleAITranscript = () => {
    const options = selectedTimeRange ? { timeRange: selectedTimeRange } : {};
    onAIAnnotation('transcript', options);
  };

  const handleAICaption = () => {
    const options = selectedTimeRange ? { timeRange: selectedTimeRange } : {};
    onAIAnnotation('caption', options);
  };

  const handleAISummary = () => {
    const options = selectedTimeRange ? { timeRange: selectedTimeRange } : {};
    onAIAnnotation('summary', options);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const rangeStartPercentage = selectedTimeRange && duration > 0 ? (selectedTimeRange.start / duration) * 100 : 0;
  const rangeEndPercentage = selectedTimeRange && duration > 0 ? (selectedTimeRange.end / duration) * 100 : 0;

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-black flex flex-col'
    : 'h-full bg-gray-900 flex flex-col';

  return (
    <div className={containerClass} ref={containerRef}>
      {/* AI分析工具栏 */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-2 flex items-center space-x-2">
          <Button size="sm" onClick={handleAITranscript} className="bg-blue-500 hover:bg-blue-600">
            <MessageSquareIcon size={16} className="mr-1" />
            AI转录
          </Button>
          <Button size="sm" onClick={handleAICaption} className="bg-green-500 hover:bg-green-600">
            <CaptionsIcon size={16} className="mr-1" />
            AI字幕
          </Button>
          <Button size="sm" onClick={handleAISummary} className="bg-purple-500 hover:bg-purple-600">
            <BrainIcon size={16} className="mr-1" />
            AI摘要
          </Button>
        </Card>
      </div>

      {/* 时间范围选择工具 */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="p-2 flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => {
              setIsSelectingRange(!isSelectingRange);
              setRangeStart(null);
              if (!isSelectingRange) setSelectedTimeRange(null);
            }}
            variant={isSelectingRange ? "default" : "ghost"}
          >
            时间选择
          </Button>
          {selectedTimeRange && (
            <>
              <Badge variant="outline">
                {formatTime(selectedTimeRange.start)} - {formatTime(selectedTimeRange.end)}
              </Badge>
              <Button 
                size="sm" 
                onClick={() => setSelectedTimeRange(null)} 
                variant="ghost"
              >
                清除
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* 视频播放器 */}
      <div className="flex-1 flex items-center justify-center relative">
        {previewUrl && (
          <video
            ref={videoRef}
            src={previewUrl}
            className="max-w-full max-h-full"
            onClick={togglePlay}
          />
        )}
        
        {!previewUrl && (
          <div className="text-center text-white">
            <div className="animate-pulse">
              <div className="w-96 h-64 bg-gray-700 rounded-lg mb-4 mx-auto"></div>
            </div>
            <p>正在加载视频预览...</p>
          </div>
        )}

        {/* 播放/暂停覆盖按钮 */}
        {!isPlaying && previewUrl && (
          <Button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70"
            variant="ghost"
          >
            <PlayIcon size={32} className="text-white ml-1" />
          </Button>
        )}
      </div>

      {/* 控制栏 */}
      <div className="bg-black bg-opacity-80 text-white p-4">
        {/* 进度条 */}
        <div 
          ref={progressRef}
          className="relative w-full h-2 bg-gray-600 rounded-full mb-4 cursor-pointer"
          onClick={handleProgressClick}
        >
          {/* 背景进度条 */}
          <div className="absolute inset-0 bg-gray-600 rounded-full"></div>
          
          {/* 选择的时间范围 */}
          {selectedTimeRange && (
            <div
              className="absolute top-0 h-full bg-yellow-400 bg-opacity-50"
              style={{
                left: `${rangeStartPercentage}%`,
                width: `${rangeEndPercentage - rangeStartPercentage}%`
              }}
            ></div>
          )}
          
          {/* 当前进度 */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
          
          {/* 进度指示器 */}
          <div
            className="absolute top-1/2 w-4 h-4 bg-blue-500 rounded-full transform -translate-y-1/2"
            style={{ left: `${progressPercentage}%`, marginLeft: '-8px' }}
          ></div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 播放控制 */}
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={() => skipTime(-10)} variant="ghost">
                <SkipBackIcon size={16} />
              </Button>
              <Button size="sm" onClick={togglePlay} variant="ghost">
                {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              </Button>
              <Button size="sm" onClick={() => skipTime(10)} variant="ghost">
                <SkipForwardIcon size={16} />
              </Button>
            </div>

            {/* 时间显示 */}
            <div className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* 播放速度 */}
            <div className="flex items-center space-x-1">
              <span className="text-xs">速度:</span>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <Button
                  key={rate}
                  size="sm"
                  onClick={() => changePlaybackRate(rate)}
                  variant={playbackRate === rate ? "default" : "ghost"}
                  className="text-xs px-2 py-1"
                >
                  {rate}x
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* 音量控制 */}
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={toggleMute} variant="ghost">
                {isMuted || volume === 0 ? (
                  <VolumeXIcon size={16} />
                ) : volume < 0.5 ? (
                  <VolumeIcon size={16} />
                ) : (
                  <Volume2Icon size={16} />
                )}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>

            {/* 全屏 */}
            <Button size="sm" onClick={toggleFullscreen} variant="ghost">
              {isFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
            </Button>
          </div>
        </div>
      </div>

      {/* 视频信息 */}
      <div className="absolute bottom-20 left-4 z-10">
        <Card className="p-3">
          <div className="flex items-center space-x-4 text-sm">
            {fileData.video_width && fileData.video_height && (
              <Badge variant="outline">
                {fileData.video_width} × {fileData.video_height}
              </Badge>
            )}
            {fileData.frame_rate && (
              <Badge variant="outline">
                {fileData.frame_rate} FPS
              </Badge>
            )}
            {fileData.video_codec && (
              <Badge variant="outline">
                {fileData.video_codec}
              </Badge>
            )}
            {fileData.duration && (
              <Badge variant="outline">
                {formatTime(fileData.duration)}
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* 操作提示 */}
      {isSelectingRange && (
        <div className="absolute bottom-20 right-4 z-10">
          <Card className="p-3">
            <p className="text-sm">
              {rangeStart === null ? '点击进度条开始选择时间范围' : '再次点击完成时间范围选择'}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};