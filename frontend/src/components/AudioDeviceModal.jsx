import React, { useState, useEffect, useRef } from 'react';
import { X, Headphones, Mic, Volume2, Check, RefreshCw, Radio, Sparkles, AlertCircle } from 'lucide-react';

export default function AudioDeviceModal({
  isOpen,
  onClose,
  devices = [],
  selectedDeviceId = '',
  onSelectDevice,
  onRefreshDevices,
}) {
  const [testLevel, setTestLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(true);
  const [testError, setTestError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const testStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Start live test when modal opens or selectedDeviceId changes
  useEffect(() => {
    if (isOpen && isTesting) {
      startDeviceTest(selectedDeviceId);
    } else {
      stopDeviceTest();
    }

    return () => {
      stopDeviceTest();
    };
  }, [isOpen, selectedDeviceId, isTesting]);

  const stopDeviceTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setTestLevel(0);
  };

  const startDeviceTest = async (deviceId) => {
    stopDeviceTest();
    setTestError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setTestError("MediaDevices API is not supported in this browser.");
      return;
    }

    try {
      const constraints = {
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {})
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      testStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      analyserRef.current = analyser;

      const timeData = new Float32Array(analyser.fftSize);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeData);

        let sumSquares = 0.0;
        for (let i = 0; i < timeData.length; i++) {
          sumSquares += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sumSquares / timeData.length);
        const amplified = Math.min(100, Math.round(rms * 450));
        setTestLevel(amplified);

        animFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      console.warn("Test mic error:", err);
      setTestError("Could not access microphone. Please grant permission or check if the device is disconnected.");
    }
  };

  const handleDeviceClick = (deviceId) => {
    if (onSelectDevice) {
      onSelectDevice(deviceId);
    }
    try {
      localStorage.setItem('classbridge_audio_device_id', deviceId);
    } catch (e) {}
  };

  const handleScan = async () => {
    setIsScanning(true);
    if (onRefreshDevices) {
      await onRefreshDevices();
    }
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  if (!isOpen) return null;

  const activeDevice = devices.find((d) => d.deviceId === selectedDeviceId) || devices[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card audio-device-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Headphones size={20} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Microphone & Headset Settings
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Select your connected Bluetooth headset or internal laptop mic
              </div>
            </div>
          </div>
          <button className="btn-minimal" onClick={onClose} style={{ padding: '6px' }} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Live Audio Test Card */}
        <div
          style={{
            margin: '16px 24px 8px',
            padding: '14px 18px',
            background: 'rgba(10, 14, 26, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
              <Volume2 size={15} color={testLevel > 10 ? 'var(--accent-emerald)' : 'var(--accent-cyan)'} />
              <span>Live Mic Test ({activeDevice?.label || 'Selected Microphone'})</span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                background: testLevel > 15 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: testLevel > 15 ? 'var(--accent-emerald)' : 'var(--text-dim)',
                border: testLevel > 15 ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid transparent',
              }}
            >
              {testLevel > 15 ? `Level: ${testLevel}% (Signal Detected)` : 'Listening for audio...'}
            </span>
          </div>

          {/* Equalizer Waveform Test Meter */}
          <div
            style={{
              height: '32px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflow: 'hidden',
            }}
          >
            {[...Array(24)].map((_, i) => {
              const active = testLevel > i * 4;
              const barHeight = active
                ? Math.max(6, Math.min(26, (testLevel / 100) * 26 + Math.sin(i * 0.8) * 4))
                : 3;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${barHeight}px`,
                    borderRadius: '2px',
                    background: active
                      ? 'linear-gradient(180deg, #38bdf8, #34d399)'
                      : 'rgba(255, 255, 255, 0.08)',
                    transition: 'height 0.08s ease, background 0.15s ease',
                  }}
                />
              );
            })}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Speak into your microphone or Bluetooth headset now. The bars will dance green/cyan when sound is detected.
          </div>

          {testError && (
            <div
              style={{
                fontSize: '12px',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <AlertCircle size={14} />
              <span>{testError}</span>
            </div>
          )}
        </div>

        {/* Device Selection List */}
        <div style={{ padding: '12px 24px', flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              AVAILABLE AUDIO INPUT DEVICES ({devices.length})
            </div>
            <button
              className="chip-btn"
              onClick={handleScan}
              disabled={isScanning}
              style={{ padding: '3px 10px', fontSize: '11px' }}
              title="Rescan for newly paired Bluetooth or USB microphones"
            >
              <RefreshCw size={11} className={isScanning ? 'spin-icon' : ''} />
              <span>{isScanning ? 'Scanning...' : 'Rescan Devices'}</span>
            </button>
          </div>

          {devices.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              No audio input devices detected yet. Click "Rescan Devices" or ensure browser microphone permissions are enabled.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {devices.map((device, idx) => {
                const isSelected = selectedDeviceId
                  ? device.deviceId === selectedDeviceId
                  : idx === 0;

                return (
                  <div
                    key={device.deviceId || idx}
                    onClick={() => handleDeviceClick(device.deviceId)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected
                        ? 'rgba(56, 189, 248, 0.12)'
                        : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected
                        ? '1.5px solid var(--accent-cyan)'
                        : '1px solid var(--border-subtle)',
                      boxShadow: isSelected ? '0 0 16px rgba(56, 189, 248, 0.18)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '8px',
                          background: device.isBluetooth
                            ? 'rgba(52, 211, 153, 0.15)'
                            : 'rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {device.isBluetooth ? (
                          <Headphones size={17} color="var(--accent-emerald)" />
                        ) : (
                          <Mic size={17} color="var(--accent-cyan)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '13.5px',
                            color: isSelected ? '#fff' : 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {device.label || `Microphone ${idx + 1}`}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          {device.isBluetooth && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-pill)',
                                background: 'rgba(52, 211, 153, 0.2)',
                                color: '#6ee7b7',
                                border: '1px solid rgba(52, 211, 153, 0.4)',
                              }}
                            >
                              🎧 Bluetooth Headset
                            </span>
                          )}

                          {device.isUsb && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-pill)',
                                background: 'rgba(168, 85, 247, 0.2)',
                                color: '#c084fc',
                              }}
                            >
                              🎙️ USB Audio
                            </span>
                          )}

                          {device.isDefault && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-pill)',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              System Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                      {isSelected ? (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'var(--accent-cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)',
                          }}
                        >
                          <Check size={14} color="#08090d" strokeWidth={3} />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            border: '1.5px solid rgba(255, 255, 255, 0.2)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bluetooth Help Note */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <Sparkles size={14} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <b>Tip:</b> If your Bluetooth headset does not appear, make sure it is connected in your laptop's Bluetooth settings and click <b>"Rescan Devices"</b>.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(10, 14, 26, 0.5)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Active: <b>{activeDevice?.label || 'Default Microphone'}</b>
          </div>
          <button
            className="btn-record idle"
            onClick={onClose}
            style={{ padding: '7px 20px', fontSize: '13px' }}
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
}
