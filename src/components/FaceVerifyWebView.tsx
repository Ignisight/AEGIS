/**
 * FaceVerifyWebView.tsx
 *
 * Hidden WebView that runs face-api.js completely on-device.
 *
 * Message protocol:
 *   RN → WebView:  window.handleRequest({ type, imageBase64, referenceDescriptor? })
 *   WebView → RN:  postMessage JSON
 *     { type:'ready' }
 *     { type:'descriptor', data: number[] }   ← setup mode result
 *     { type:'result', match: bool, score: number } ← verify mode result
 *     { type:'error', message: string }
 */

import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// ── face-api.js WebView bridge HTML ────────────────────────────────────────
// Pinned to @vladmandic/face-api@1.7.14 for stability.
// Models are loaded from jsDelivr CDN on first use (~7 MB), cached thereafter.
const FACE_BRIDGE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin:0; background:#000; overflow:hidden; }
    img, canvas { display:none; }
  </style>
</head>
<body>
  <img id="img" crossorigin="anonymous" />
  <canvas id="canvas"></canvas>

  <script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.min.js"></script>
  <script>
    var MODEL_URL   = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model';
    var modelsReady = false;
    var pending     = null;

    function post(obj) {
      window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    // ── Load all required models ──────────────────────────────────────────
    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        modelsReady = true;
        post({ type: 'ready' });
        if (pending) { processRequest(pending); pending = null; }
      } catch (e) {
        post({ type: 'error', message: 'Model load failed: ' + e.message });
      }
    }

    // ── Extract 128D descriptor from a base64 JPEG ────────────────────────
    function getDescriptor(base64) {
      return new Promise(function(resolve, reject) {
        var el = document.getElementById('img');
        el.onload = async function() {
          try {
            var det = await faceapi
              .detectSingleFace(el, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
              .withFaceLandmarks()
              .withFaceDescriptor();
            resolve(det ? Array.from(det.descriptor) : null);
          } catch (e) { reject(e); }
        };
        el.onerror = function() { reject(new Error('Image failed to load')); };
        el.src = 'data:image/jpeg;base64,' + base64;
      });
    }

    // ── Process incoming request ──────────────────────────────────────────
    async function processRequest(req) {
      try {
        if (req.type === 'setup') {
          var desc = await getDescriptor(req.imageBase64);
          if (!desc) {
            post({ type: 'error', message: 'No face detected. Please look directly at the camera in good lighting.' });
            return;
          }
          post({ type: 'descriptor', data: desc });

        } else if (req.type === 'verify') {
          var live = await getDescriptor(req.imageBase64);
          if (!live) {
            post({ type: 'error', message: 'No face detected in selfie. Please try again.' });
            return;
          }
          var ref   = new Float32Array(req.referenceDescriptor);
          var liveF = new Float32Array(live);
          var score = faceapi.euclideanDistance(liveF, ref);
          post({ type: 'result', match: score < 0.6, score: score });
        }
      } catch (e) {
        post({ type: 'error', message: e.message });
      }
    }

    // ── Called by React Native via injectJavaScript ───────────────────────
    window.handleRequest = function(req) {
      if (!modelsReady) { pending = req; return; }
      processRequest(req);
    };

    loadModels();
  </script>
</body>
</html>`;

// ── Props ──────────────────────────────────────────────────────────────────
interface FaceVerifyWebViewProps {
    mode: 'setup' | 'verify';
    imageBase64: string;
    referenceDescriptor?: number[];
    onDescriptor: (descriptor: number[]) => void;
    onResult: (match: boolean, score: number) => void;
    onError: (message: string) => void;
}

// ══════════════════════════════════════════════════════════════════════════
// Component — renders off-screen (height 0, no visible UI)
// ══════════════════════════════════════════════════════════════════════════
export default function FaceVerifyWebView({
    mode,
    imageBase64,
    referenceDescriptor,
    onDescriptor,
    onResult,
    onError,
}: FaceVerifyWebViewProps) {
    const webViewRef = useRef<WebView>(null);

    const handleLoadEnd = () => {
        // Inject request after page finishes loading.
        // pendingRequest in the HTML handles the case where models aren't ready yet.
        const req = mode === 'setup'
            ? { type: 'setup', imageBase64 }
            : { type: 'verify', imageBase64, referenceDescriptor };

        const script = `window.handleRequest(${JSON.stringify(req)}); true;`;
        webViewRef.current?.injectJavaScript(script);
    };

    const handleMessage = (event: any) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            switch (msg.type) {
                case 'ready':
                    break; // handled in HTML via pending queue
                case 'descriptor':
                    onDescriptor(msg.data);
                    break;
                case 'result':
                    onResult(msg.match, msg.score);
                    break;
                case 'error':
                    onError(msg.message);
                    break;
            }
        } catch {
            onError('Internal bridge error');
        }
    };

    return (
        <View style={styles.hidden}>
            <WebView
                ref={webViewRef}
                source={{ html: FACE_BRIDGE_HTML }}
                onLoadEnd={handleLoadEnd}
                onMessage={handleMessage}
                javaScriptEnabled
                domStorageEnabled
                cacheEnabled
                mixedContentMode="always"
                originWhitelist={['*']}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    // Truly hidden — takes no space, no interaction, just runs JS
    hidden: { width: 0, height: 0, overflow: 'hidden', position: 'absolute' },
});
