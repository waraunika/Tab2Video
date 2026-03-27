"use client";

import * as three from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseModelViewerReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  playing: boolean;
  currentTime: number;
  duration: number;
  playPause: () => void;
  restart: () => void;
  seekTo: (time: number) => void;
  // imperatively drive playback from outside (e.g. synced to AlphaTab)
  setExternalPlaying: (playing: boolean) => void;
}

export interface UseModelViewerOptions {
  modelPath: string;
  // called when the animation reaches its end and stops
  onAnimationEnd?: () => void;
}

export function useModelViewer({
  modelPath,
  onAnimationEnd,
}: UseModelViewerOptions): UseModelViewerReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /**
   * stored in refs so animate loop (closure) can read/write them
   * no need to be recreated on every state change.
   */
  const internalRef = useRef({
    mixer: null as three.AnimationMixer | null,
    action: null as three.AnimationAction | null,
    clip: null as three.AnimationClip | null,
    isPlaying: false,
    animationFrameId: 0,
    renderer: null as three.WebGLRenderer | null,
    scene: null as three.Scene | null,
    camera: null as three.Camera | null,
    controls: null as OrbitControls | null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    // get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;

    // renderer
    const renderer = new three.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = three.PCFSoftShadowMap;
    renderer.toneMapping = three.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = three.SRGBColorSpace;

    // scene & light
    const scene = new three.Scene();
    scene.add(new three.AmbientLight(0xffffff, 1));

    const clock = new three.Timer();
    let controls: OrbitControls | null = null;
    let camera: three.Camera | null = null;
    let animFrameId: number;

    const state = internalRef.current;

    //animation loop
    function animate() {
      animFrameId = requestAnimationFrame(animate);
      clock.update();
      const delta = clock.getDelta();

      if (state.mixer && state.isPlaying) {
        state.mixer.update(delta);

        if (state.action && state.clip) {
          const t = state.action.time;

          // stop-at-end: clamp and halt instead of looping
          if (t >= state.clip.duration) {
            state.action.paused = true;
            state.action.time = state.clip.duration;
            state.isPlaying = false;
            setPlaying(false);
            setCurrentTime(state.clip.duration);
            onAnimationEnd?.();
          } else {
            setCurrentTime(t);
          }
        }
      }

      if (controls) controls.update();
      if (camera) renderer.render(scene, camera);
    }

    // camera setup
    function setUpCamera() {
      const foundCameras: three.Camera[] = [];
      scene.traverse((obj) => {
        if ((obj as three.Camera).isCamera) foundCameras.push(obj as three.Camera);
      });

      camera = foundCameras[0] ?? (() => {
        const cam = new three.PerspectiveCamera(
          75,
          window.innerWidth / window.innerHeight,
          0.1,
          1000,
        );
        cam.position.set(0, 1, 3);
        scene.add(cam);
        return cam;
      })();

      if ((camera as three.PerspectiveCamera).isPerspectiveCamera) {
        (camera as three.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
        (camera as three.PerspectiveCamera).updateProjectionMatrix();
      }

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      const box = new three.Box3().setFromObject(scene);
      controls.target.copy(box.getCenter(new three.Vector3()));
      controls.update();

      animate();
    }

    // load model
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        scene.add(gltf.scene);

        if (gltf.animations.length > 0) {
          state.clip = gltf.animations[0];
          state.mixer = new three.AnimationMixer(gltf.scene);
          state.action = state.mixer.clipAction(state.clip);
          // Don't auto-play — wait for explicit play command or sync
          state.action.play();
          state.action.paused = true;
          state.isPlaying = false;

          setDuration(state.clip.duration);
        }

        setUpCamera();
      },
      undefined,
      (err) => console.error("GLB load error:", err),
    );

    // resize handler
    function onResize() {
      if (camera && (camera as three.PerspectiveCamera).isPerspectiveCamera) {
        (camera as three.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
        (camera as three.PerspectiveCamera).updateProjectionMatrix();
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    // cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", onResize);
      controls?.dispose();
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath]);

  // controls
  const playPause = useCallback(() => {
    const state = internalRef.current;
    if (!state.action) return;
    // If at end, restart from beginning instead of resuming
    if (state.action.time >= (state.clip?.duration ?? Infinity) - 0.01) {
      state.action.reset();
      state.action.play();
      state.isPlaying = true;
      setPlaying(true);
      setCurrentTime(0);
      return;
    }
    state.isPlaying = !state.isPlaying;
    state.action.paused = !state.isPlaying;
    setPlaying(state.isPlaying);
  }, []);

  const restart = useCallback(() => {
    const state = internalRef.current;
    if (!state.action) return;
    state.action.reset();
    state.action.play();
    state.isPlaying = true;
    setPlaying(true);
    setCurrentTime(0);
  }, []);

  const seekTo = useCallback((time: number) => {
    const state = internalRef.current;
    if (!state.action || !state.mixer) return;
    
    const clampedTime = Math.min(Math.max(time,0), duration);
    state.action.time = clampedTime;
    state.mixer.update(0);
    setCurrentTime(clampedTime);

    if (!state.isPlaying) state.action.paused = true;
    setCurrentTime(time);
  }, [duration]);

  // driven externally (by AlphaTab sync)
  const setExternalPlaying = useCallback((shouldPlay: boolean) => {
    const state = internalRef.current;
    if (!state.action) return;

    if (shouldPlay && state.action.time >= (state.clip?.duration ?? Infinity)) {
      // don't resume a finished animation
      return;
    }
    state.isPlaying = shouldPlay;
    state.action.paused = !shouldPlay;
    setPlaying(shouldPlay);
  }, []);

  return {
    canvasRef,
    playing,
    currentTime,
    duration,
    playPause,
    restart,
    seekTo,
    setExternalPlaying,
  };
}