import { Route, Routes } from "react-router-dom";

export default function Logo() {
  return (
    <Routes>
      <Route path="/" element={<img style={{"width": "40px", "marginRight": "20px", "cursor": "pointer"}} src='/public/logo.webp'/>} />
    </Routes>
  );
}
