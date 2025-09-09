import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { IoReturnDownBack } from "react-icons/io5";
import "./Vr.css";

function Vr() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let controller: THREE.XRTargetRaySpace;

    const init = () => {
      const container = containerRef.current;

      scene = new THREE.Scene();

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
      renderer.setAnimationLoop(animate);
      renderer.xr.enabled = true;

      if (container) {
        container.appendChild(renderer.domElement);
      }

      // Botão AR
      document.body.appendChild(ARButton.createButton(renderer));

      // Geometria
      const geometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 32).rotateX(
        Math.PI / 2
      );

      function onSelect() {
        const material = new THREE.MeshPhongMaterial({
          color: 0xffffff * Math.random(),
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, -0.3).applyMatrix4(controller.matrixWorld);
        mesh.quaternion.setFromRotationMatrix(controller.matrixWorld);
        scene.add(mesh);
      }

      controller = renderer.xr.getController(0);
      controller.addEventListener("select", onSelect);
      scene.add(controller);

      window.addEventListener("resize", onWindowResize);
    };

    const onWindowResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    init();

    // Cleanup
    return () => {
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
      }
      window.removeEventListener("resize", onWindowResize);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <main className="container">
      <button onClick={() => window.location.reload()}>
        <IoReturnDownBack size={28} />
      </button>
      <div ref={containerRef} className="container" />;
    </main>
  );
}

export default Vr;
