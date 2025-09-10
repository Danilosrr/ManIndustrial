import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { IoReturnDownBack } from "react-icons/io5";
import "./Vr.css";

function Vr() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelUrl, setModelUrl] = useState("/models/motor/motor.gltf"); // current selected model
  const [wireframe, setWireframe] = useState(false);

  useEffect(() => {
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let controller: THREE.XRTargetRaySpace;
    let model: THREE.Object3D | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let localSpace: XRReferenceSpace | null = null;
    let reticle: THREE.Mesh | null = null;

    // GLTF loader with DRACO support
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
    );
    loader.setDRACOLoader(dracoLoader);

    const init = () => {
      const container = containerRef.current;

      scene = new THREE.Scene();

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(0, 5, 5);
      scene.add(directionalLight);

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      hemiLight.position.set(0, 1, 0);
      scene.add(hemiLight);

      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
      light.position.set(0.5, 1, 0.25);
      scene.add(light);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;

      if (container) container.appendChild(renderer.domElement);

      document.body.appendChild(
        ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
      );

      // 🔹 Environment map setup
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;

      // Reticle
      const geometry = new THREE.RingGeometry(0.07, 0.09, 32).rotateX(
        -Math.PI / 2
      );
      const material = new THREE.MeshBasicMaterial({ color: 0x2d76cb });
      reticle = new THREE.Mesh(geometry, material);
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      // Controller
      controller = renderer.xr.getController(0);
      controller.addEventListener("select", onSelect);
      scene.add(controller);

      window.addEventListener("resize", onWindowResize);

      // Hit test setup
      renderer.xr.addEventListener("sessionstart", async () => {
        const session = renderer.xr.getSession();
        if (!session) return;

        localSpace = await session.requestReferenceSpace("viewer");
        if (typeof session.requestHitTestSource === "function") {
          hitTestSource =
            (await session.requestHitTestSource({ space: localSpace })) ?? null;
        }

        session.addEventListener("end", () => {
          hitTestSource = null;
          localSpace = null;
        });
      });

      renderer.setAnimationLoop(animate);
    };

    function onSelect() {
      if (reticle?.visible) {
        if (!model) {
          loader.load(
            modelUrl,
            (gltf) => {
              model = gltf.scene;

              model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  (child as THREE.Mesh).material =
                    new THREE.MeshStandardMaterial({
                      color: 0xd3d3d3, // Light gray
                      metalness: 1.0,
                      roughness: 0.4, // keeps reflections visible
                      wireframe: wireframe,
                      envMapIntensity: 1.0, // use scene.environment
                    });
                }
              });

              if (reticle) {
                model.position.setFromMatrixPosition(reticle.matrix);
                model.quaternion.setFromRotationMatrix(reticle.matrix);
              }
              scene.add(model);
            },
            undefined,
            (error) => {
              console.error("Error loading GLTF model:", error);
              alert(`Erro carregando modelo GLTF: ${error}`);
            }
          );
        } else {
          model.position.setFromMatrixPosition(reticle.matrix);
          model.quaternion.setFromRotationMatrix(reticle.matrix);
        }
      }
    }

    const onWindowResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = (time?: number, frame?: XRFrame) => {
      if (!renderer || !scene || !camera) return;

      if (frame && hitTestSource && reticle && localSpace) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const referenceSpace = renderer.xr.getReferenceSpace();
          if (referenceSpace) {
            const pose = hit.getPose(referenceSpace);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            }
          }
        } else {
          reticle.visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    init();

    return () => {
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
      }
      window.removeEventListener("resize", onWindowResize);
      if (containerRef.current) containerRef.current.innerHTML = "";
      hitTestSource = null;
      localSpace = null;
    };
  }, [wireframe, modelUrl]); // re-run effect if modelUrl changes

  return (
    <main className="container">
      <div className="dropdown">
        <button onClick={() => window.location.reload()}>
          <IoReturnDownBack size={28} />
        </button>

        <div className="controls">
          <label>
            <input
              type="checkbox"
              checked={wireframe}
              onChange={() => setWireframe(!wireframe)}
            />
            Wireframe Mode
          </label>
        </div>

        <select value={modelUrl} onChange={(e) => setModelUrl(e.target.value)}>
          <option value="/models/motor/motor.gltf">Motor</option>
          <option value="/models/caliper/caliper.gltf">Freio</option>
          <option value="/models/piston-valve/piston-valve.gltf">Pistão</option>
          <option value="/models/virabrequim/virabrequim.gltf">
            Virabrequim
          </option>
        </select>
      </div>

      <div ref={containerRef} className="container" />
    </main>
  );
}

export default Vr;
