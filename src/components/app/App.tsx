import { useState } from "react";
import twinLogo from "../../assets/twin.png";
import "./App.css";
import Vr from "../vr/Vr";

function App() {
  const [vr, setvr] = useState(false);

  if (vr) return <Vr /> 
    else return (
      <>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={twinLogo} className="logo" alt="Vite logo" />
          </a>
        </div>
        <h1>Prova de conceito</h1>

        <div className="card">
          <button onClick={() => setvr(true)}><b>Criar geometria</b></button>
        </div>
        <div className="card"/>
        <div className="card bottom-text">
          <p>Grupo 01</p>
          <p className="read-the-docs">Manutenção Industrial 2025.1</p>
        </div>
      </>
    );
}

export default App;
