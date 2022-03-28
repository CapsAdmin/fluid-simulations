import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { BlobSimulation } from "./simulations/blobs";
import { PaintSimulation } from "./simulations/paint";
import { StrangeFluidSimulation } from "./simulations/strange-fluid";

export const SimulationCanvas = () => {
  return (
    <canvas style={{ width: "100vw", height: "100vh" }} id="webgl"></canvas>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/paint" element={<PaintSimulation />} />
        <Route path="/blobs" element={<BlobSimulation />} />
        <Route path="/strange-fluid" element={<StrangeFluidSimulation />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
