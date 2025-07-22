import {BrowserRouter, Routes, Route} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Register from "./components/auth/Register";
import Login from "./components/auth/Login";
import "./App.css"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/login" element={<Login/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
